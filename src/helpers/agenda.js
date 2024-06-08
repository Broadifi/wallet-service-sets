const Agenda = require('agenda');
const mongoose = require('mongoose');
const { Billing } = require('../models/billing');
const { Wallet } = require('../models/wallet');
const moment = require('moment');

const agenda = new Agenda({ db: { address: process.env.MONGODB_URI, collection: 'agendaJobs' } });


agenda.define('update billing hourly', async (job) => {
  const { billingId } = job.attrs.data;

  try {
    const billing = await Billing.findById(billingId);
    if (!billing) {
      throw new Error('Billing record not found');
    }

    const now = moment();
    const wallet = await Wallet.findOne({ createdBy: billing.userId });

    if (!wallet) {
      throw new Error('Wallet not found for the user');
    }

    const startTime = moment(billing.startTime);
    const durationHours = moment.duration(now.diff(startTime)).asHours();

    if (parseFloat(wallet.credit) >= parseFloat(billing.hourlyRate)) {
      const cost = parseFloat(billing.totalCost) + parseFloat(billing.hourlyRate);
      billing.totalCost = cost.toFixed(2);
      wallet.credit = parseFloat(wallet.credit) - parseFloat(billing.hourlyRate);
      
      billing.durationHours = durationHours;
      billing.endTime = billing.endTime 
        ? moment(billing.endTime).add(1, 'hours').toDate() 
        : now.add(1, 'hours').toDate();

      await wallet.save();
      const updatedBilling = await billing.save();
      console.log('Billing updated:', updatedBilling);
      
    } else {
      
      const jobs = await agenda.jobs({ "data.billingId": billingId });
      if (jobs.length === 0) {
          return { message: 'Job not found' };
      }
      await jobs[0].remove();
      await Billing.updateOne( { _id: job[0].attrs.data.billingId }, { status: "inactive"} )
      billing.endTime = now.toDate();
      billing.isActive = false;
      await billing.save();
      // Handle insufficient credit (e.g., stop service, notify user)
      console.log('Insufficient credit. Service will be stopped for user:', billing.userId);
    }
  } catch (error) {
    console.error('Error updating billing hourly:', error);
  }
});





module.exports = agenda;
