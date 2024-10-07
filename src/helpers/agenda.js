const Agenda = require('agenda');
const { Billing } = require('../models/billing');
const { Wallet } = require('../models/wallet');
const moment = require('moment');
const { float } = require('.');
const { publishMessage } = require('./publisher');

const agenda = new Agenda({ db: { address: process.env.MONGODB_URI, collection: 'agendaJobs', options: { useNewUrlParser: true, useUnifiedTopology: true } } });

// Known job definitions
const jobDefinitions = new Set();

/**
 * Defines an hourly billing job. The job will be executed every hour and will
 * update the billing and wallet of the user.
 * 
 * If the wallet has enough credit, the hourly rate of the billing will be
 * subtracted from the wallet credit and added to the billing total cost.
 * If the wallet does not have enough credit, the job will be removed and the
 * billing will be stopped.
 * 
 * @param {string} agendaJobName - The name of the job to be defined. This will
 * be used to identify the job and to check if it has already been defined.
 */
const defineHourlyBillingJob = async ( agendaJobName) => {
  agenda.define(agendaJobName, async (job) => {
    try {
      const { billingId } = job.attrs.data;
      const billing = await Billing.findById(billingId);
      const wallet = await Wallet.findOne({ createdBy: billing.userId });
      if (!billing || !wallet) throw new Error('Bill or wallet not found');
      
      if (float(wallet.credit) >= float(billing.hourlyRate)) {
        wallet.credit = float(wallet.credit) - float(billing.hourlyRate);
        wallet.totalSpend = float(wallet.totalSpend) + float(billing.hourlyRate);
        const isNewMonth = !moment(job.attrs.lastRunAt).isSame(moment(), 'month');
        if(isNewMonth) {
          wallet.lastMonthSpend = wallet.currentMonthSpend
          wallet.currentMonthSpend = '0';
        }
        wallet.currentMonthSpend = float(wallet.currentMonthSpend) + float(billing.hourlyRate);
        await wallet.save();

        billing.totalCost = float(billing.totalCost) + float(billing.hourlyRate);
        billing.durationHours = moment.duration(moment().diff(moment(billing.startTime))).asHours()
        await billing.save();
        jobDefinitions.add(agendaJobName);
      } else {
        const jobs = await agenda.jobs({ "data.billingId": billingId });
        await jobs[0].remove();
        await Billing.updateOne( { _id: jobs[0].attrs.data.billingId }, { isActive: false, endTime: moment().toISOString() })
        jobDefinitions.delete(agendaJobName);
        // Handle insufficient credit (e.g., stop service, notify user)
        console.log('Insufficient credit. Service will be stopped for user:', billing.userId);
        publishMessage( jobs[0].attrs.data.usedBy.type, JSON.stringify({ action: 'delete', data: { deploymentId: jobs[0].attrs.data.usedBy.id }}))
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
