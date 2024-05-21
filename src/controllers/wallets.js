const { ApiError } = require("../helpers");
const { createCheckoutSessions, construct } = require("../helpers/stripe");
const { PaymentHistory } = require("../models/paymentHistory");
const { Wallet } = require("../models/wallet");
const mongoose = require('mongoose')
class WalletController {



  async createCheckout( req, res, next ) {
    try {
      const { price } = req.body
      console.log(req.user)
      const userCollection = mongoose.connection.db.collection('users');
      const user = await userCollection.findOne({_id: new mongoose.mongo.ObjectId(req.user.userId) })
      console.log(user)
      if( !user ) {
        throw new ApiError('NOT_FOUND_ERROR', 'User not found')
      }
      const checkout = await createCheckoutSessions(price, req.user.userId, user.email)
      res.sendSuccessResponse(checkout)
    } catch (e) {
      console.log(e)
      next(e)
    }
  }

  async webohook (req, res, next) {
    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
      const sig = req.headers['stripe-signature'];
      let event = req.body
      console.log(event)
      const { type , data: { object: eventObj }} = event

      if(type === 'checkout.session.completed' && eventObj.payment_status === 'paid' && eventObj.status === 'complete'){
        const r = await wallet.create({paymentId: eventObj.payment_intent, status: eventObj.payment_status, credit: eventObj.amount_total, createdBy:eventObj.client_reference_id})
        return res.send({ data: r });
      }
    } catch (e) {
      next(e)
    }
  }

  async useCredit(req, res, next ) {
    try {
      const { credit, service } = req.body
      const wallet = await Wallet.findOne( { createdBy: req.user.userId } )
      if( wallet.credit < Number(credit)) {
        throw new ApiError(null,'Insufficient credit', 402)
      }
      const updateCredit = wallet.credit - credit
      const item = await Wallet.updateOne({ userId: req.user.userId}, { credit, service, updateCredit })
      //add transcations
      res.sendSuccessResponse( item )
      } catch (e) {
      next(e)
    }
  }

  async getWallet(req, res, next ) {
    try {
      const item = await Wallet.findOne({createdBy: req.user.userId})
      res.sendSuccessResponse(item)
    } catch (e) {
      next(e)
    }
  }
  
}

module.exports = {WalletController: new WalletController()}