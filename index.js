/**
 * Bootstrap the application
 * @module index
 */
require('dotenv').config();
const express = require('express');
const { Database } = require('./config');
const { App } = require('./src/App');
const agenda = require('./src/helpers/agenda');
const { billingTrackerQueue } = require('./src/helpers/queue');
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
    agenda.start()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`Error: ${error}`);
    process.exit(1);
  }
};

initApp();