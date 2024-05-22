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
        const isWalletExist = await Wallet.findOne( { createdBy: eventObj.client_reference_id  } )
        if( isWalletExist ) {
          const credit = Number(isWalletExist.credit) - Number(eventObj.amount_total)
          const r = await Wallet.updateOne({createdBy: eventObj.client_reference_id}, {credit})
          return res.send({ data: r });
        }
        const r = await Wallet.create({paymentId: eventObj.payment_intent, status: eventObj.payment_status, credit: eventObj.amount_total, createdBy:eventObj.client_reference_id})
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
      console.log(wallet)
      if( wallet.credit < Number(credit)) {
        throw new ApiError(null,'Insufficient credit', 402)
      }
      console.log(wallet.credit, credit)
      const updateCredit = Number(wallet.credit) - Number(credit)
      console.log(updateCredit)
      const item = await Wallet.updateOne({ createdBy: req.user.userId}, { credit: updateCredit })
      res.sendSuccessResponse( null, { updated: true } )
      } catch (e) {
      next(e)
    }
  }

  async getWallet(req, res, next ) {
    try {
      const item = await Wallet.findOne({createdBy: req.user.userId}, { paymentId: 0 })
      res.sendSuccessResponse(item)
    } catch (e) {
      next(e)
    }
  }
  
}

module.exports = {WalletController: new WalletController()}