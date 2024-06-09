const Agenda = require('agenda');
const moment = require('moment');
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = 3000;

// Set up MongoDB connection
const mongoConnectionString = 'mongodb://127.0.0.1:27017/agenda';

const agenda = new Agenda({ db: { address: mongoConnectionString, options: { useNewUrlParser: true, useUnifiedTopology: true } } });

// Set up Mongoose connection
mongoose.connect(mongoConnectionString, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Mongoose connected to MongoDB'))
  .catch(err => {
    console.error(`Error connecting to MongoDB with Mongoose: ${err.message}`);
    process.exit(1);
  });

// Define the job schema (matching Agenda's job document structure)
const jobSchema = new mongoose.Schema({}, { collection: 'agendaJobs', strict: false });
const Job = mongoose.model('Job', jobSchema);

// Known job definitions
const jobDefinitions = new Set();

app.use(express.json());

app.post('/schedule-job', async (req, res) => {
  const { name, interval, data } = req.body;

  // Define the job if it doesn't exist
  if (!jobDefinitions.has(name)) {
    console.log(`Defining job: ${name}`);
    agenda.define(name, async job => {
      console.log(`Executing ${name} with data: ${JSON.stringify(job.attrs.data)} at ${moment().format('LTS')}`);
    });
    jobDefinitions.add(name);
  }

  // Schedule the job
  try {
    await agenda.every(interval, name, data);
    res.send(`Job ${name} scheduled to run every ${interval}`);
  } catch (error) {
    console.error(`Error scheduling job ${name}: ${error.message}`);
    res.status(500).send(`Error scheduling job ${name}: ${error.message}`);
  }
});

app.get('/jobs', async (req, res) => {
  try {
    const jobs = await Job.find();
    const jobDetails = jobs.map(job => ({
      name: job.name,
      nextRunAt: job.nextRunAt,
      data: job.data
    }));
    res.json(jobDetails);
  } catch (error) {
    console.error(`Error fetching jobs: ${error.message}`);
    res.status(500).send('Error fetching jobs: ' + error.message);
  }
});

app.listen(port, async () => {
  try {
    console.log(`Connecting to MongoDB at ${mongoConnectionString}...`);
    await agenda.start();
    console.log('Agenda started');

    // Define existing jobs on server start
    try {
      const jobs = await Job.find();
      jobs.forEach(job => {
        const jobName = job.name;
        if (!jobDefinitions.has(jobName)) {
          console.log(`Defining existing job: ${jobName}`);
          agenda.define(jobName, async () => {
            console.log(`Executing ${jobName} with data: ${JSON.stringify(job.data)} at ${moment().format('LTS')}`);
          });
          jobDefinitions.add(jobName);
        }
      });
    } catch (error) {
      console.error(`Error fetching existing jobs on startup: ${error.message}`);
    }

    console.log(`Server is running on http://localhost:${port}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit the process with an error code
  }
});