const mongoose = require('mongoose');

class Wallet {
  schema = new mongoose.Schema({
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    credit: {
      type: String,
      default: '0'
    },
    currency: {
      type: String,
      default: "USD"
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    totalSpend: {
      type: String,
      default: '0'
    },
    currentMonthSpend: {
      type: String,
      default: '0'
    },
    lastMonthSpend: {
      type: String,
      default: '0'
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    }
  });


  getModel() {
    return mongoose.model('wallets', this.schema);
  }
}

module.exports = { Wallet: new Wallet().getModel() };
