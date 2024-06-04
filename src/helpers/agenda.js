const Agenda = require('agenda');
const mongoose = require('mongoose');
const { Billing } = require('../models/billing');
const { Wallet } = require('../models/wallet');

const agenda = new Agenda({ db: { address: process.env.MONGODB_URI, collection: 'agendaJobs' } });

agenda.define('update billing hourly', async (job) => {
  const { billingId } = job.attrs.data;

  try {
    const billing = await Billing.findById(billingId).populate('usageLogs');
    if (!billing) {
      throw new Error('Billing record not found');
    }

    const now = new Date();
    const wallet = await Wallet.findOne({ createdBy: billing.userId });
    if (!wallet) {
      throw new Error('Wallet not found for the user');
    }

    let usageLog = billing.usageLogs;
    
    if (!usageLog) {
      usageLog = {
        startTime: now,
        durationHours: 0,
        endTime: null
      };
      billing.usageLogs = usageLog;
    }

    const startTime = new Date(usageLog.startTime);
    const durationHours = (now - startTime) / 36e5;
    const cost = durationHours * billing.hourlyRate;
    /**
     * add nessecary logic to handle the deployment and billing
     */
    if (wallet.credit >= cost) {
      billing.totalCost = parseFloat((billing.totalCost + cost).toFixed(2));
      wallet.credit = parseFloat((wallet.credit - cost).toFixed(2));
      usageLog.durationHours = durationHours;
      usageLog.endTime = usageLog.endTime 
        ? new Date(usageLog.endTime.getTime() + 36e5) 
        : new Date(now.getTime() + 36e5); 

      await wallet.save();
      await billing.save();
    } else {
      usageLog.endTime = now;
      await billing.save();
      // Handle insufficient credit (e.g., stop service, notify user)
      console.log('Insufficient credit. Service will be stopped for user:', billing.userId);
    }
  } catch (error) {
    console.error('Error updating billing hourly:', error);
  }
});


module.exports = agenda;
