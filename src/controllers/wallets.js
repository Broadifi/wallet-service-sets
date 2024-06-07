const { ApiError } = require("../helpers");
const { createCheckoutSessions, construct } = require("../helpers/stripe");
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
/** TODO
 * add payment history
 */
  async webohook (req, res, next) {
    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
      const sig = req.headers['stripe-signature'];
      let event = construct(req.body, sig, endpointSecret)
      console.log(event)
      const { type , data: { object: eventObj }} = event

      if(type === 'checkout.session.completed' && eventObj.payment_status === 'paid' && eventObj.status === 'complete'){
        const isWalletExist = await Wallet.findOne( { createdBy: eventObj.client_reference_id  } )
        if( isWalletExist ) {
          const credit = Number(isWalletExist.credit) + ( eventObj.amount_total / 100 )
          console.log(credit)
          const r = await Wallet.updateOne({createdBy: eventObj.client_reference_id}, {credit})
          return res.send({ data: r });
        }
        const r = await Wallet.create({ credit: eventObj.amount_total / 100, createdBy:eventObj.client_reference_id})
        return res.send({ data: r });
      }
    } catch (e) {
      next(e)
    }
  }

  async getWallet(req, res, next ) {
    try {
      const item = await Wallet.findOne({createdBy: req.user.userId}, { status: 1 , credit: 1}).lean()
      item.credit = parseFloat(parseFloat(item.credit).toFixed(2))
      res.sendSuccessResponse(item)
    } catch (e) {
      next(e)
    }
  }
  
}

module.exports = {WalletController: new WalletController()}