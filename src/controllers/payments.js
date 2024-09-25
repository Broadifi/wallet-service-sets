const { payments } = require('../models/payments');
const { ApiError, createStripeCheckoutObj } = require("../helpers");
const cron = require('node-cron');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const EventEmitter = require('events');

class PaymentsController {

  constructor() {
    this.events = new EventEmitter();
    cron.schedule('* * * * *', async () => {
      try {
        await this.updateExpiredDocuments();
      } catch (error) {
        console.error('Error updating status of expired payment ckeckouts:', error);
      }
    });
  }
  async getAll(req, res, next) {
    try {
      const page = Math.ceil(req.query.page) || 1
      const limit = Math.ceil(req.query.limit) || 10
      const skip = (page - 1) * limit;
      const items = await payments.find({ userId: req.user.userId }).skip(skip).limit(limit).lean()
      const totalCount = await payments.countDocuments({ userId: req.user.userId })
      const totalPages = Math.ceil(totalCount / limit);
      const hasNext = page < totalPages;
      res.sendSuccessResponse(items, { totalCount, hasNext, page })
    } catch (e) {
      next(e)
    }
  }

  async createCheckout(req, res, next) {
    try {
      const { amount } = req.body;
      if (isNaN(amount)) throw new ApiError('VALIDATION_ERROR', 'Amount must be a valid number');

      const userCollection = mongoose.connection.db.collection('users');
      const user = await userCollection.findOne({ _id: new mongoose.mongo.ObjectId(req.user.userId) });
      if (!user) throw new ApiError('NOT_FOUND_ERROR', 'User not found');

      const checkoutObj = createStripeCheckoutObj(user, amount);
      const { id: _id, payment_status, status, currency, expires_at } = await stripe.checkout.sessions.create(checkoutObj);
      await payments.create({ _id, amount, payment_status, status, currency, createdBy: user._id, expires_at });

      res.sendSuccessResponse({ data: { stripeCheckoutId: session.id, redirectUrl: session.url }})
    } catch (e) {
      next(e)
    }
  }

  async webhook(req, res, next) {
    try {
      const { type, data: { object: event } } = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
      if (type === 'checkout.session.completed') {
        const payment = await payments.findOne({ _id: event.id });
        if (payment.status === 'complete') throw new ApiError('VALIDATION_ERROR', 'Payment already completed');
        // update payment history document
        await payments.updateOne({ _id: event.id }, { status: 'complete', payment_status: 'paid' });
        const { client_reference_id, amount_total } = event;
        // update wallet document
        this.events.emit('payment', client_reference_id, amount_total / 100);
        res.sendSuccessResponse({ message: 'Payment completed' });
      }
    } catch (e) {
      next(e)
    }
  }

  async updateExpiredDocuments() {
    const currentTime = Math.floor(Date.now() / 1000);
    try {
      const result = await payments.updateMany(
        {
          expires_at: { $lt: currentTime },
          status: 'open',
        },
        {
          $set: { status: 'complete' },
        }
      );
      if (result.modifiedCount > 0) console.log(`${result.modifiedCount} expired payment checkout's status updated.`);
    } catch (err) {
      throw err;
    }
  }
}


module.exports = { paymentsController: new PaymentsController() }