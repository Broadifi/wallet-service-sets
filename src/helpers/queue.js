const { Worker } = require("bullmq");
const { Billing } = require("../models/billing");
const { agenda, defineHourlyBillingJob, jobDefinitions } = require("./agenda");
const { redisClient } = require("./redis");
const { Wallet } = require("../models/wallet");
const { instanceConfig } = require("../models/instance");
const mongoose = require("mongoose");
const { float } = require(".");
const moment = require("moment");


const processJob = async (job) => {
    if (job.name === 'startBilling') {
        try {
            const { type } = job.data;
            const { id } = job
            const collection = mongoose.connection.db.collection(type)
            const document = await collection.findOne({_id: new mongoose.mongo.ObjectId(id) })
            const instanceDetails = await instanceConfig.findOne({ _id: document.instanceType })
            const wallet = await Wallet.findOne({ createdBy: document.createdBy });

            if( !document ) {
                throw new Error('Not found');
            }

            if (!wallet || (float(wallet.credit) < float(instanceDetails.hourlyRate))) {
                throw new Error('Payment required');
            }

            let billing = await Billing.findOne({ userId: document.createdBy, instanceDetails: instanceDetails.instanceType, 'usedBy.id': id, 'usedBy.type': type });
            console.log( billing );
            if (!billing) {
                billing = new Billing({ 
                    userId: document.createdBy, 
                    instanceType: document.instanceType,
                    hourlyRate: instanceDetails.hourlyRate, 
                    startTime: document.createdAt,
                    usedBy: { id: id, type: type, name: (document.name).includes('/') ? (document.name).split('/')[1] : document.name } 
                });
                await billing.save();
            }
            await defineHourlyBillingJob(`${billing._id.toString()}`);
            const jobDetails = await agenda.every('1 minute', `${billing._id.toString()}`, { billingId: billing._id.toString(),  usedBy: { id: id, type: type, name: (document.name).includes('/') ? (document.name).split('/')[1] : document.name }  });
            return jobDetails
        } catch (error) {
            console.error(`Error processing 'startBilling' job: ${error.message}`);
            throw error;
        }

    } else if (job.name === 'stopBilling') {
        try {
            const { id } = job
            const jobs = await agenda.jobs({ "data.usedBy.id": id });
            await jobs[0].remove();
            await Billing.updateOne( { _id: jobs[0].attrs.data.billingId }, { isActive: false, endTime: moment().toISOString() } )
            jobDefinitions.delete(jobs[0].attrs.data.billingId);
            return { message: 'Job canceled and deleted successfully' };
        } catch (err) {
            console.error(`Error processing 'stopBilling' job: ${err.message}`);
            throw err;
        }
    }
};


const billingTrackerQueue = new Worker( 'billing-tracker', processJob, { connection: redisClient, concurrency: 3 });

billingTrackerQueue.on('ready', () => {
    console.log('billing-tracker is Ready!');
})

billingTrackerQueue.on('active', (job) => {
    console.info(` [Id: ${job.id}] | billing-tracker Started`);
});
  
billingTrackerQueue.on('completed', async (job) => {
    await job.remove();
    console.log(` [Id: ${job.id}] | billing-tracker Completed & Removed from Queue`);
});
    
billingTrackerQueue.on('failed',async (job, err) => {
    console.error(` [Id: ${job.id}] | billing-tracker Failed! | ${err}`);
    if (job.attemptsMade < job.opts.attempts) {
        console.info(` [Id: ${job.id}] | billing-tracker will Retry after 30s`); 
    }else{
        await job.remove();
        console.warn(`[Id: ${job.id}] | billing-tracker Max retry Reached | Removed from Queue`);
    } 
});

billingTrackerQueue.on('error', (err) => {
    console.log(err)
});

module.exports =  { billingTrackerQueue }