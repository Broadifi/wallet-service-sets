const { publisher, subscriber } = require('./pub-sub');
const { Billing } = require('../models/billing');
const { instancesInfo } = require('../models/instance');
const { Wallet } = require('../models/wallet');
const { defineHourlyBillingJob, jobDefinitions } = require('./agenda');

// To be used for all the billing in the entire project
subscriber.on('startBilling', async ( billingInfo, ack ) => {
    try {
        const { id, type, name, deployedOn, createdBy, createdAt } = billingInfo; 
        
        const [ instanceInfo, wallet ] = await Promise.all([
            instancesInfo.findById( deployedOn ),
            Wallet.findOne({ createdBy })
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
        await defineHourlyBillingJob(billingId);
        await agenda.every('1 hour', billingId, { billingId }); 
        await ack();
    } catch (error) {
        console.log(error);
    }
})

subscriber.on('stopBilling', async ( billingObj, ack ) => {
    try {
        const { id } = billingObj;

        const billingId = await Billing.findOne({ 'usedBy.id': id }, { _id: 1 });

        const jobs = await agenda.jobs({ "data.billingId": billingId });

        if (!jobs[0]) {
            await ack();
        }
        await jobs[0].remove();

        await Billing.updateOne( { _id: billingId }, { isActive: false, endTime: moment().toISOString() } )
        
        jobDefinitions.delete(billingId);
        
        await ack();
    } catch (error) {   
        console.log(error);
    }
})
