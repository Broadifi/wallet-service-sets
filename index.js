/**
 * Bootstrap the application
 * @module index
 */
require('dotenv').config();
const express = require('express');
const { Database } = require('./config');
const { App } = require('./src/App');
require('./src/helpers/billing-processor');

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
  } catch (error) {
    console.log(`Error: ${error}`);
    process.exit(1);
  }
};

initApp();