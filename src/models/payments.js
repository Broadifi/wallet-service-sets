const mongoose = require('mongoose');

class Payments {
  schema = new mongoose.Schema({
    _id: {
      type: String
    },
    amount: {
      type: String
    },
    payment_status: {
      type: String,
      enum: ['paid', 'unpaid'],
      default: 'unpaid'
    },
    status: {
      type: String,
      enum: ['open', 'complete'],
      default: 'open'
    },
    currency: {
      type: String,
      default: 'usd'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId, // Assuming users are stored as ObjectIds in MongoDB
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date
    }
  });

  getModel() {
    return mongoose.model('payments', this.schema);
  }
}

module.exports = { payments: new Payments().getModel() };
