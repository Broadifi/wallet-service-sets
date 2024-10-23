const mongoose = require('mongoose');
class Billing {
  schema = new mongoose.Schema({
    status: {
      type: String,
      enum: ['active', 'paused', 'finished'],
      default: 'active'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'users',
      required: true,
    },
    deployedOn: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'compute_units',
      required: true,
    },
    usedBy:{
      id: {
        type: mongoose.Schema.Types.ObjectId,
        unique: true
      },
      type: {
        type: String,
      },
      name: {
        type: String
      }
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
    }
  }, { timestamps: true });


  getModel() {
    // eslint-disable-next-line no-console
    return mongoose.model('billings', this.schema);
  }
}

module.exports = { Billing: new Billing().getModel() };
