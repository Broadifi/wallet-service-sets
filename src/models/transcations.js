const mongoose = require('mongoose');

class Transactions {
  schema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Assuming users are stored as ObjectIds in MongoDB
    },
    status: {
        type: String,
    },
    creditUsed: {
      type: String,
    },
    currency: {
        type: String,
    },
    service: {
        type: String,
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
    console.log('Transactions model created');
    return mongoose.model('transactions', this.schema);
  }
}

module.exports = { Transactions: new Transactions().getModel() };
