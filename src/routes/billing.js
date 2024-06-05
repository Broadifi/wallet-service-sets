const express = require('express');
const { checkLogin } = require('../middleware/Auth');
const { billingController } = require('../controllers/billing');

class BillingRoutes {
  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.get('/', checkLogin, billingController.getAll)
    this.router.get('/:id', checkLogin, billingController.get)
  }

  getRouter() {
    return this.router;
  }
}

module.exports = { BillingRoutes: new BillingRoutes().getRouter() };
