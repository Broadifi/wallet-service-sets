const { Worker } = require("bullmq");
const { Billing } = require("../models/billing");
const { agenda, defineHourlyBillingJob, jobDefinitions } = require("./agenda");
const { redisClient } = require("./redis");
const { Wallet } = require("../models/wallet");
const { instanceConfig } = require("../models/instance");
const mongoose = require("mongoose");
const { float } = require(".");
const moment = require("moment");
const logger = require("./logger");


const processJob = async (job) => {
    const { id, name, data: { type } } = job;
    if (name === 'startBilling') {
        try {
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
            const billingId = billing._id.toString();
            const documentName = document.name.includes('/') ? document.name.split('/')[1] : document.name;
            await defineHourlyBillingJob(billingId);
            const jobDetails = await agenda.every('1 hour', billingId, { 
                billingId, 
                usedBy: { 
                    id, 
                    type, 
                    name: documentName 
                } 
            });
            return jobDetails
        } catch (error) {
            console.error(`Error processing 'startBilling' job: ${error.message}`);
            throw error;
        }

    } else if (name === 'stopBilling') {
        try {
            const jobs = await agenda.jobs({ "data.usedBy.id": id });
            if (!jobs[0]) {
                return { message: 'No job found' }; // throw new Error('No job found');
            }
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
    logger.success('billing-tracker is Ready!');
    
})

billingTrackerQueue.on('active', (job) => {
    if( job.name === 'startBilling' ) {
        logger.info(` [Id: ${job.id}] | billing Started`);
    }

    if( job.name === 'stopBilling' ) {
        logger.info(` [Id: ${job.id}] | billing Stopped`);
    }    
});
  
billingTrackerQueue.on('completed', async (job) => {
    await job.remove();
});
    
billingTrackerQueue.on('failed',async (job, err) => {
    logger.warn(` [Id: ${job.id}] | billing Failed! | ${err}`);
    if (job.attemptsMade < job.opts.attempts) {
        logger.info(` [Id: ${job.id}] | billing will Retry after 30s`); 
    }else{
        await job.remove();
        logger.error(`[Id: ${job.id}] | billing Max retry Reached | Removed from Queue`);
    } 
});

billingTrackerQueue.on('error', (err) => {
    console.log(err)
});

module.exports =  { billingTrackerQueue }