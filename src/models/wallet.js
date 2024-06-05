const mongoose = require('mongoose');

class Wallet {
  schema = new mongoose.Schema({
    paymentId: {
      type: String,
    },
    status: {
      type: String,
    },
    credit: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId, // Assuming users are stored as ObjectIds in MongoDB
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
    // eslint-disable-next-line no-console
    console.log('Wallet model created');
    return mongoose.model('wallets', this.schema);
  }
}

module.exports = { Wallet: new Wallet().getModel() };
