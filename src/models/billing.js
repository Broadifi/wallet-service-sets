const mongoose = require('mongoose');
class Billing {
  schema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'users',
      required: true,
    },
    instanceType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'instance-config',
      required: true,
    },
    hourlyRate: {
      type: String,
      required: true,
      default: 0
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    durationHours: {
      type: Number,
    },
    totalCost: {
      type: String,
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
