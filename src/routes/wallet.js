const express = require('express');
const { checkLogin } = require('../middleware/Auth');
const { WalletController } = require('../controllers/wallets');

class WalletRoutes {
  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.post('/', checkLogin, WalletController.createCheckout)
    this.router.post('/use-credit', checkLogin, WalletController.useCredit)
    this.router.post('/webook', WalletController.webohook)
    this.router.get('/:id', checkLogin, WalletController.getWallet)

    
  }

  getRouter() {
    return this.router;
  }
}

module.exports = { WalletRoutes: new WalletRoutes().getRouter() };
