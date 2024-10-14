const mongoose = require('mongoose');

class Payments {
  schema = new mongoose.Schema({
    _id: {
      type: String
    },
    amount: {
      type: String
    },
    url: {
      type: String
    },
    payment_status: {
      type: String,
      enum: ['paid', 'unpaid'],
      default: 'unpaid'
    },
    status: {
      type: String,
      enum: ['open', 'complete', 'expired'],
      default: 'open'
    },
    currency: {
      type: String,
      default: 'usd'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    createdAt: {
      type: Date,
      default: Date.now,
    }
  });

  getModel() {
    return mongoose.model('payments', this.schema);
  }
}

module.exports = { payments: new Payments().getModel() };
