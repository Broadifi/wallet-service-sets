const Agenda = require('agenda');
const { Billing } = require('../models/billing');
const { Wallet } = require('../models/wallet');
const moment = require('moment');
const { formatHours, float } = require('.');

const agenda = new Agenda({ db: { address: process.env.MONGODB_URI, collection: 'agendaJobs', options: { useNewUrlParser: true, useUnifiedTopology: true } } });

// Known job definitions
const jobDefinitions = new Set();

const defineHourlyBillingJob = async ( agendaJobName) => {
  agenda.define(agendaJobName, async (job) => {
    try {
      const { billingId } = job.attrs.data;
      const billing = await Billing.findById(billingId);
      if (!billing) {
        throw new Error('Billing record not found');
      }
  
      const wallet = await Wallet.findOne({ createdBy: billing.userId });
      if (!wallet) {
        throw new Error('Wallet not found for the user');
      }
  
      if (float(wallet.credit) >= float(billing.hourlyRate)) {
        console.log("in")
        wallet.credit = float(wallet.credit) - float(billing.hourlyRate);
        await wallet.save();

        billing.totalCost = float(billing.totalCost) + float(billing.hourlyRate);
        billing.durationHours = moment.duration(moment().diff(moment(billing.startTime))).asHours()
        await billing.save();

        jobDefinitions.add(agendaJobName);
      } else {
        const jobs = await agenda.jobs({ "data.billingId": billingId });
        await jobs[0].remove();
        await Billing.updateOne( { _id: job[0].attrs.data.billingId }, { isActive: false, endTime: moment().toISOString() })
        jobDefinitions.delete(agendaJobName);
        // Handle insufficient credit (e.g., stop service, notify user)
        console.log('Insufficient credit. Service will be stopped for user:', billing.userId);
      }
      console.log('Billing updated:', billingId);
      return true;
    } catch (error) {
      console.error('Error updating billing hourly:', error);
      throw error;
    }
  });
}








module.exports = { agenda, defineHourlyBillingJob, jobDefinitions };
