/**
 * Bootstrap the application
 * @module index
 */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { Database } = require('./config');
const { App } = require('./src/App');
const { agenda, jobDefinitions, defineHourlyBillingJob } = require('./src/helpers/agenda');

// Define the job schema (matching Agenda's job document structure)
const agendaJobSchema = new mongoose.Schema({}, { collection: 'agendaJobs', strict: false });
const AgendaJobs = mongoose.model('agendaJobs', agendaJobSchema);

const initApp = async () => {
  try {
    await Database.connect(process.env.MONGODB_URI);
    const app = new App({
      config: {
        port: process.env.PORT,
      },
      express,
    });
    app.init();
    const jobs = await AgendaJobs.find();
    jobs.forEach(job => {
      const jobName = job.name;
      if (!jobDefinitions.has(jobName)) {
        console.log(`Redefining existing job: ${jobName}`);
        defineHourlyBillingJob(jobName)
        jobDefinitions.add(jobName);
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`Error: ${error}`);
    process.exit(1);
  }
};

initApp();