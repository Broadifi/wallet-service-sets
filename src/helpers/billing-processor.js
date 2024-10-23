const Agenda = require('agenda');
const moment = require('moment');
const mongoose = require('mongoose');
const { float } = require('.');
const { Billing } = require('../models/billing');
const { computeUnits } = require('../models/compute-units');
const { Wallet } = require('../models/wallet');
const { publisher, subscriber } = require('./pub-sub');


class BillingProcessor {

    constructor() {
        this.collection = 'billingJobs';
        this.agendaJobSchema = new mongoose.Schema({}, { collection: this.collection, strict: false });
        this.agendaJobsModel = mongoose.model(this.collection, this.agendaJobSchema);
        this.agenda = new Agenda({ 
            db: { 
                    address: process.env.MONGODB_URI,
                    collection: this.collection,
                    options: { 
                        useNewUrlParser: true, 
                        useUnifiedTopology: true 
                    } 
                } 
        });
        this.agendaJobs = new Set();
        subscriber.on('start-billing', this.startBilling.bind(this));
        subscriber.on('stop-billing', this.stopBilling.bind(this));
        this.initAgenda();
    }

    async initAgenda() {
        await this.agenda.start();
        const existingJobs = await this.agendaJobsModel.find();
        // dynamically redefine existing jobs
        existingJobs.forEach( async ({ name: job }) => {
          if (!this.agendaJobs.has(job)) {
            console.log(`Redefining existing job: ${job}`);
            await this.addHourlyBillingJob(job)
            this.agendaJobs.add(job);
          }
        });
    }

    async addHourlyBillingJob ( jobName ) {
        this.agenda.define(jobName, async (job) => {
          try {
            const { billingId } = job.attrs.data;

            // get billing and wallet
            const bill = await Billing.findById(billingId);
            if (!bill) throw new Error('Bill not found');

            const userWallet = await Wallet.findOne({ owner: bill.userId });
            if (!userWallet) throw new Error('wallet not found');

            const hourlyRate = float(bill.hourlyRate);
      
            // if the wallet has enough credit
            if (float(userWallet.credit) >= hourlyRate) {

                // update the wallet
                userWallet.credit = float(userWallet.credit) - hourlyRate;
                userWallet.totalSpent = float(userWallet.totalSpent) + hourlyRate;

                // if it's a new month
                const isNewMonth = !moment(job.attrs.lastRunAt).isSame(moment(), 'month');
                if(isNewMonth) {
                    userWallet.lastMonthSpent = userWallet.currentMonthSpent
                    userWallet.currentMonthSpent = '0';
                }

                userWallet.currentMonthSpent = float(userWallet.currentMonthSpent) + hourlyRate;

                // update the billing
                bill.totalCost = float(bill.totalCost) + hourlyRate;
                bill.durationHours = moment.duration(moment().diff(moment(bill.startTime))).asHours();

                // save to database
                await Promise.all([ userWallet.save(), bill.save()]);

                // add to local job definitions set
                this.agendaJobs.add(jobName);
            } else {
                // if the wallet does not have enough credit.

                const [ job ] = await this.agenda.jobs({ "data.billingId": billingId });
                if (!job) throw new Error('Job not found');

                // remove the agenda job
                await job.remove();

                // update the bill
                await Billing.updateOne( { _id: billingId }, { status: 'paused' });

                // remove from local job definitions set
                this.agendaJobs.delete(jobName);

                // stop the service
                console.log('Insufficient credit. Service will be stopped for user:', bill.userId.toString());
                publisher.emit('pause-service', { type: bill.usedBy.type, id: bill.usedBy.id })
            }
            console.log('Billing updated:', billingId);
          } catch (error) {
            console.error('Error billing:', error);
          }
        });
    }
    
    // To be used for all the billing in the entire project
    async startBilling(billingInfo, ack) { 
        try {
            const { id, type, name, deployedOn, owner, createdAt } = billingInfo;
            if( !id || !type || !name || !deployedOn || !owner || !createdAt ) {
                throw new Error('missing required field');
            }

            const [ computeUnit, wallet ] = await Promise.all([
                computeUnits.findById( deployedOn ),
                Wallet.findOne({ owner })
            ])
            const { hourlyRate } = computeUnit;
            
            // Check if the wallet has enough credit
            if( !wallet || (float(wallet.credit) < float(hourlyRate))) {
                throw new Error('Payment required');
            }
    
            const billing = new Billing({ 
                userId: owner, 
                deployedOn,
                hourlyRate, 
                startTime: createdAt,
                usedBy: { 
                    id, 
                    type, 
                    name
                } 
            });
            await billing.save();
            const billingId = billing._id.toString(); 
    
            // agenda
            await this.addHourlyBillingJob(billingId);
            await this.agenda.every('1 minute', billingId, { billingId }); 

            // acknowledge the messsage
            await ack();
        } catch (error) {
            publisher.emit('stop-service', { type: billingInfo.type, id: billingInfo.id })
            console.log(error);
        }
    }

    async stopBilling(billingInfo, ack) {
        try {
            const { id } = billingInfo;
    
            const bill = await Billing.findOne({ 'usedBy.id': new mongoose.Types.ObjectId(id) });
            if(!bill) throw new Error('Billing not found');
            const billingId = bill._id.toString();
    
            const [ job ] = await this.agenda.jobs({ "data.billingId": billingId });
            if (!job) {
                await ack();
                return;
            }
            await job.remove();
    
            await Billing.updateOne( { _id: new mongoose.Types.ObjectId(billingId) }, { status: 'finished', endTime: moment().toISOString() } )
            this.agendaJobs.delete(billingId);
            
            await ack();
        } catch (error) {   
            console.log(error);
        }
    }


    async resumeBilling(userId){
        try {
            const pausedBills = await Billing.find({ 'userId': new mongoose.Types.ObjectId(userId), status: 'paused' });
            if(!pausedBills) return ;

            let { credit } = await Wallet.findOne({ owner: userId });
            credit = float(credit);
            if(credit === 0) return;

            for (const bill of pausedBills) {
                const hourlyRate = float(bill.hourlyRate);
                if(credit < hourlyRate) break;
                credit -= hourlyRate;
                const billingId = bill._id.toString();
                await Billing.updateOne( { _id: new mongoose.Types.ObjectId(billingId) }, { status: 'active' } )
                await this.addHourlyBillingJob(billingId);
                await this.agenda.every('1 minute', billingId, { billingId });
                publisher.emit('resume-service', { type: bill.usedBy.type, id: bill.usedBy.id });
            }
        } catch (error) {   
            console.log(error);
        }
    }
    
}

new BillingProcessor();

