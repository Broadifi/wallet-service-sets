const { ApiError, formatHours } = require("../helpers");
const { createCheckoutSessions, construct } = require("../helpers/stripe");
const { Billing } = require("../models/billing");
const { Wallet } = require("../models/wallet");
const mongoose = require('mongoose')
class WalletController {

  async createCheckout( req, res, next ) {
    try {
      const { amount } = req.body
      console.log(req.user)
      const userCollection = mongoose.connection.db.collection('users');
      const user = await userCollection.findOne({_id: new mongoose.mongo.ObjectId(req.user.userId) })
      if( !user ) {
        throw new ApiError('NOT_FOUND_ERROR', 'User not found')
      }
      const checkout = await createCheckoutSessions(amount, req.user.userId, user.email )
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
      // const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
      // console.log(endpointSecret)
      // const sig = req.headers['stripe-signature'];
      // console.log(req.headers)
      // let event = construct(req.body, sig, endpointSecret)
      // console.log(event)
      const { type , data: { object: eventObj }} = req.body

      if(type === 'checkout.session.completed' && eventObj.payment_status === 'paid' && eventObj.status === 'complete'){
        const isWalletExist = await Wallet.findOne( { createdBy: eventObj.client_reference_id  } )
        if( isWalletExist ) {
          const credit = Number(isWalletExist.credit) + ( eventObj.amount_total / 100 )
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
      let item = await Wallet.findOne({createdBy: req.user.userId}, { status: 1 , credit: 1, _id: 0, currency: 1}).lean()
      if( !item ) {
        item = (await Wallet.create({createdBy: req.user.userId } )).toJSON()
      }
      item.credit = parseFloat(parseFloat(item.credit).toFixed(2))

      const activeBills = await Billing.find({ isActive: true, userId: req.user.userId }).lean();
      let costPerHour = 0;          
      let timeleftInHour = null; 

      if( activeBills.length !== 0 ) {
        costPerHour = activeBills.reduce((acc, bill) => {
          return acc + parseFloat(bill.hourlyRate);
        }, 0);

        timeleftInHour = formatHours(item.credit / costPerHour)
      }
      const { status, credit, currency } = item

      res.sendSuccessResponse({ status, credit, currency, currentSpending: costPerHour, timeleftInHour  } )
    } catch (e) {
      next(e)
    }
  }

}

module.exports = {WalletController: new WalletController()}