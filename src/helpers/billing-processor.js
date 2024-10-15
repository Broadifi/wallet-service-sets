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
        subscriber.on('startBilling', this.startBilling);
        subscriber.on('stopBilling', this.stopBilling);
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
             const [billing, wallet] = await Promise.all([
              Billing.findById(billingId),
              Wallet.findOne({ owner: job.attrs.data.userId })
            ])
            if (!billing || !wallet) throw new Error('Bill or wallet not found');
      
            // if the wallet has enough credit
            if (float(wallet.credit) >= float(billing.hourlyRate)) {
              // update the wallet
              wallet.credit = float(wallet.credit) - float(billing.hourlyRate);
              wallet.totalSpent = float(wallet.totalSpent) + float(billing.hourlyRate);
              // if it's a new month
              const isNewMonth = !moment(job.attrs.lastRunAt).isSame(moment(), 'month');
              if(isNewMonth) {
                wallet.lastMonthSpent = wallet.currentMonthSpent
                wallet.currentMonthSpent = '0';
              }
              wallet.currentMonthSpent = float(wallet.currentMonthSpent) + float(billing.hourlyRate);
              // update the billing
              billing.totalCost = float(billing.totalCost) + float(billing.hourlyRate);
              billing.durationHours = moment.duration(moment().diff(moment(billing.startTime))).asHours()
              // save to database
              await Promise.all([ wallet.save(), billing.save()])
              // add to local job definitions set
              this.agendaJobs.add(agendaJobName);
            } else {
              // remove the job if the wallet does not have enough credit
              const jobs = await agenda.jobs({ "data.billingId": billingId });
              await jobs[0].remove();
              await Billing.updateOne( { _id: jobs[0].attrs.data.billingId }, { isActive: false, endTime: moment().toISOString() })
              this.agendaJobs.delete(agendaJobName);
              // Handle insufficient credit 
              console.log('Insufficient credit. Service will be stopped for user:', billing.userId);
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
            await this.agenda.every('1 hour', billingId, { billingId }); 
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

