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
    totalSpent: {
      type: String,
      default: '0'
    },
    currentMonthSpent: {
      type: String,
      default: '0'
    },
    lastMonthSpent: {
      type: String,
      default: '0'
    }
  }, { timestamps: true });


  getModel() {
    return mongoose.model('wallets', this.schema);
  }
}

module.exports = { Wallet: new Wallet().getModel() };
