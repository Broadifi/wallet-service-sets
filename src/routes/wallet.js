const express = require('express');
const { checkLogin } = require('../middleware/Auth');
const { WalletController } = require('../controllers/wallets');
const { paymentsController}= require('../controllers/payments');

class WalletRoutes {
  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.post('/add-credit', checkLogin, paymentsController.createCheckout)
    this.router.get('/', checkLogin, WalletController.getWallet)
  }

  getRouter() {
    return this.router;
  }
}

module.exports = { WalletRoutes: new WalletRoutes().getRouter() };
