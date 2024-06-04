const mongoose = require('mongoose');
class Billing {
  schema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Assuming users are stored as ObjectIds in MongoDB
      ref: 'User',
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    hourlyRate: {
      type: Number,
      required: true,
    },
    usageLogs: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'usageLogs',
    },
    totalCost: {
      type: Number,
      default: 0,
    },
    lastBilled: {
      type: Date,
      default: Date.now,
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
    console.log('Billing model created');
    return mongoose.model('billings', this.schema);
  }
}

module.exports = { Billing: new Billing().getModel() };
