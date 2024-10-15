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
