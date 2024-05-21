const mongoose = require('mongoose');

class PaymentHistory {
  schema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Assuming users are stored as ObjectIds in MongoDB
    },
    status: {
        type: String,
    },
    credit: {
      type: String,
    },
    currency: {
        type: String,
    },
    name: {
        type: String,
    },
    email: {
        type: String,
    },
    cardType: {
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
    console.log('PaymentHistory model created');
    return mongoose.model('paymentHistory', this.schema);
  }
}

module.exports = { PaymentHistory: new PaymentHistory().getModel() };
