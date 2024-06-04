const mongoose = require('mongoose');

class UsageLog {
  schema = new mongoose.Schema({
    service: {
      type: String,
      required: true,
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
    cost: {
      type: Number
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
    console.log('UsageLog model created');
    return mongoose.model('usageLogs', this.schema);
  }
}

module.exports = { UsageLog: new UsageLog().getModel() };
