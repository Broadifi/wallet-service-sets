const Agenda = require('agenda');
const mongoose = require('mongoose');
const { Billing } = require('../models/billing');
const { Wallet } = require('../models/wallet');

const agenda = new Agenda({ db: { address: process.env.MONGODB_URI, collection: 'agendaJobs' } });

agenda.define('update billing hourly', async (job) => {
  const { billingId } = job.attrs.data;

  try {

    const billing = await Billing.findById(billingId);
    if (!billing) {
      throw new Error('Billing record not found');
    }

    const now = new Date();
    const wallet = await Wallet.findOne({ createdBy: billing.userId });

    if (!wallet) {
      throw new Error('Wallet not found for the user');
    }

    const startTime = new Date(billing.startTime);
    const durationHours = (now - startTime) / 36e5;

    /**
     * add nessecary logic to handle the deployment and billing
     */

    if ( parseFloat(wallet.credit) >= parseFloat( billing.hourlyRate) ) {
      // console.log( wallet.credit, billing.hourlyRate)
      const cost = parseFloat(billing.totalCost) + parseFloat(billing.hourlyRate)
      billing.totalCost = cost.toFixed(2);
      // console.log(parseFloat(billing.totalCost) + parseFloat(billing.hourlyRate))
      wallet.credit = parseFloat(wallet.credit) - parseFloat(billing.hourlyRate );
      // console.log(parseFloat(wallet.credit) - parseFloat(billing.hourlyRate ))
      billing.durationHours = durationHours;
      billing.endTime = billing.endTime 
        ? new Date(billing.endTime.getTime() + 36e5) 
        : new Date(now.getTime() + 36e5); 

      await wallet.save();
      const bill = await billing.save();
      console.log('billing -------')
      console.log(bill)
    } else {
      billing.endTime = now;
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
