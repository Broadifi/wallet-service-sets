const { Worker, tryCatch } = require("bullmq");
const { Billing } = require("../models/billing");
const { UsageLog } = require("../models/usageLog");
const agenda = require("./agenda");
const { redisClient } = require("./redis");
const { Wallet } = require("../models/wallet");

const processJob = async (job) => {
    if (job.name === 'add') {
        const { userId, hourlyRate, serviceName } = job.data;
        try {
            const wallet = await Wallet.findOne({ createdBy: userId });

            if (!wallet || Number(wallet.credit) < Number(hourlyRate)) {
                throw new Error('Payment required');
            }

            let billing = await Billing.findOne({ userId, serviceName });

            if (!billing) {
                billing = new Billing({ userId, serviceName, hourlyRate });
                await billing.save();
            }

            const usageLog = new UsageLog({
                service: serviceName,
                startTime: new Date(),
                userId
            });
            await usageLog.save();

            billing.usageLogs = usageLog._id;
            await billing.save();

            await agenda.every('10 minute', 'update billing hourly', { billingId: billing._id.toString() });

        } catch (error) {
            console.error(`Error processing 'add' job: ${error.message}`);
            throw error;
        }

    } else if (job.name === 'remove') {
        try {
            const { jobId } = job.data;

            const jobs = await agenda.jobs({ "data.billingId": jobId });
            if (jobs.length === 0) {
                return { message: 'Job not found' };
            }
            await jobs[0].remove();

            return { message: 'Job canceled and deleted successfully' };
        } catch (err) {
            console.error(`Error processing 'remove' job: ${err.message}`);
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
    console.assert(` [Id: ${job.id}] | billing-tracker Completed & Removed from Queue`);
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