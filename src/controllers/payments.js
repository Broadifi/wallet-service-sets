const { payments } = require('../models/payments');
const { ApiError, createStripeCheckoutObj } = require("../helpers");
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const EventEmitter = require('events');

class PaymentsController {

  constructor() {
    this.events = new EventEmitter();
    this.webhook = this.webhook.bind(this);
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
      const { id: _id, payment_status, status, currency, url } = await stripe.checkout.sessions.create(checkoutObj);
      await payments.create({ _id, amount, payment_status, status, currency, createdBy: user._id, url });

      res.sendSuccessResponse({ data: { stripeCheckoutId: _id, redirectUrl: url }})
    } catch (e) {
      next(e)
    }
  }

  async webhook(req, res, next) {
    try {
      const { type, data: { object: event } } = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
      const payment = await payments.findOne({ _id: event.id });

      if (type === 'checkout.session.completed') {
        if (payment.status === 'complete') throw new ApiError('VALIDATION_ERROR', 'Payment already completed');

        await payments.updateOne({ _id: event.id }, { status: 'complete', payment_status: 'paid' });
        
        // update wallet document
        const { client_reference_id, amount_total } = event;
        this.events.emit('payment', client_reference_id, amount_total / 100);
        return res.sendSuccessResponse({ message: 'Payment completed' });

      }else if (type === 'checkout.session.expired') {
        await payments.updateOne({ _id: event.id }, { status: 'expired' });
        return res.sendSuccessResponse({ message: 'Payment expired' });
      }
      throw new ApiError('UNKNOWN_ERROR', 'Payment not found');
    } catch (e) {
      next(e)
    }
  }
}


module.exports = { paymentsController: new PaymentsController() }