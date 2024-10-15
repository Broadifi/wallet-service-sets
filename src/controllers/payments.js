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
      const items = await payments.find({ createdBy: req.user.userId }, { __v: 0, createdBy: 0 }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
      const totalCount = await payments.countDocuments({ createdBy: req.user.userId })
      const totalPages = Math.ceil(totalCount / limit);
      const hasNext = page < totalPages;
      res.sendSuccessResponse(items, { totalCount, hasNext, page })
    } catch (e) {
      next(e)
    }
  }

  /**
   * Creates a new Stripe checkout session and saves the payment information to the database
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   * @returns {Promise<void>}
   * @throws {ApiError} If the user is not found or if the payment amount is invalid
   */
  async createCheckout(req, res, next) {
    try {
      // validate amount
      const { amount } = req.body;
      if (isNaN(amount)) throw new ApiError('VALIDATION_ERROR', 'Amount must be a valid number');

      // check if user exists
      const userCollection = mongoose.connection.db.collection('users');
      const user = await userCollection.findOne({ _id: new mongoose.mongo.ObjectId(req.user.userId) });
      if (!user) throw new ApiError('NOT_FOUND_ERROR', 'User not found');

      // create checkout session
      const checkoutObj = createStripeCheckoutObj(user, amount);
      const { id: _id, payment_status, status, currency, url } = await stripe.checkout.sessions.create(checkoutObj);
      await payments.create({ _id, amount, payment_status, status, currency, createdBy: user._id, url });

      // send response
      res.sendSuccessResponse({ data: { stripeCheckoutId: _id, redirectUrl: url }})
    } catch (e) {
      next(e)
    }
  }

  /**
   * Handles Stripe webhooks for checkout sessions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   * @returns {Promise<void>}
   * @throws {ApiError} If the payment is not found, or if the payment status is invalid
   */
  async webhook(req, res, next) {
    try {
      const { type, data: { object: event } } = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
      const payment = await payments.findOne({ _id: event.id });

      if (type === 'checkout.session.completed') {
        if (payment.status === 'complete') throw new ApiError('VALIDATION_ERROR', 'Payment already completed');

        await payments.updateOne({ _id: event.id }, { status: 'complete', payment_status: 'paid', url: '' });
        
        // emit event to update wallet
        const { client_reference_id, amount_total } = event;
        this.events.emit('payment', client_reference_id, amount_total / 100);

        return res.sendSuccessResponse({ message: 'Payment completed' });
      }else if (type === 'checkout.session.expired') {
        await payments.updateOne({ _id: event.id }, { status: 'expired', url: '' });
        return res.sendSuccessResponse({ message: 'Payment link expired' });
      }
      throw new ApiError('UNKNOWN_ERROR', 'Payment not found');
    } catch (e) {
      next(e)
    }
  }
}


module.exports = { paymentsController: new PaymentsController() }