const EventEmitter = require('events');
const { publisher, subscriber } = require('./pub-sub');
const { WalletController } = require('../controllers/wallets');
const { paymentsController } = require('../controllers/payments');

// const internalEvents = new EventEmitter();

paymentsController.events.on('payment:done', async (userId, amount) => await WalletController.updateWalletCredit(userId, amount));

WalletController.events.on('wallet:updated', (userId) => {
    console.log(`Wallet updated for user: ${userId}`)
});

// module.exports = { internalEvents }