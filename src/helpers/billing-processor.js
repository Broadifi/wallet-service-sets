const Agenda = require('agenda');
const moment = require('moment');
const mongoose = require('mongoose');
const { float } = require('.');
const { Billing } = require('../models/billing');
const { instancesInfo } = require('../models/instance');
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
        subscriber.on('startBilling', this.startBilling.bind(this));
        subscriber.on('stopBilling', this.stopBilling.bind(this));
        this.initAgenda();
    }

    async initAgenda() {
        await this.agenda.start();
        const existingJobs = await this.agendaJobsModel.find();
        existingJobs.forEach( async ({ name: job }) => {
          if (!this.agendaJobs.has(job)) {
            console.log(`Redefining existing job: ${job}`);
            await this.defineHourlyBillingJob(job)
            this.agendaJobs.add(job);
          }
        });
    }

    async defineHourlyBillingJob ( agendaJobName ) {
        this.agenda.define(agendaJobName, async (job) => {
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
              bill.durationHours = moment.duration(moment().diff(moment(bill.startTime))).asHours()
              // save to database
              await Promise.all([ userWallet.save(), bill.save()])
              // add to local job definitions set
              this.agendaJobs.add(agendaJobName);
            } else {
              // remove the job if the wallet does not have enough credit.
              const jobs = await this.agenda.jobs({ "data.billingId": billingId });
              await jobs[0].remove();
              await Billing.updateOne( { _id: billingId }, { isActive: false, endTime: moment().toISOString() })
              this.agendaJobs.delete(agendaJobName);
              // Handle insufficient credit 
              console.log('Insufficient credit. Service will be stopped for user:', bill.userId);
              publisher.emit('stopService', {
                type: jobs[0].attrs.data.usedBy.type,
                id: jobs[0].attrs.data.usedBy.id
              })
            }
            console.log('Billing updated:', billingId);
          } catch (error) {
            console.error('Error updating billing hourly:', error);
          }
        });
    }
    
    // To be used for all the billing in the entire project
    async startBilling(billingInfo, ack) { 
        try {
            const { id, type, name, deployedOn, createdBy, createdAt } = billingInfo; 
            
            const [ instanceInfo, wallet ] = await Promise.all([
                instancesInfo.findById( deployedOn ),
                Wallet.findOne({ owner: createdBy })
            ])
            const { hourlyRate } = instanceInfo;
            
            // Check if the wallet has enough credit
            if( !wallet || (float(wallet.credit) < float(hourlyRate))) {
                throw new Error('Payment required');
            }
    
            const billing = new Billing({ 
                    userId: createdBy, 
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
    
            const billingId = String(billing._id); 
    
            // agenda
            await this.defineHourlyBillingJob(billingId);
            await this.agenda.every('1 minute', billingId, { billingId }); 
            await ack();
        } catch (error) {
            console.log(error);
        }
    }

    async stopBilling(billingInfo, ack) {
        try {
            const { id } = billingInfo;
    
            const billingId = await Billing.findOne({ 'usedBy.id': id }, { _id: 1 });
    
            const jobs = await this.agenda.jobs({ "data.billingId": billingId });
    
            if (!jobs[0]) {
                await ack();
            }
            await jobs[0].remove();
    
            await Billing.updateOne( { _id: billingId }, { isActive: false, endTime: moment().toISOString() } )
            
            this.agendaJobs.delete(billingId);
            
            await ack();
        } catch (error) {   
            console.log(error);
        }
    }
    
}

new BillingProcessor();

