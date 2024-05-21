const { ApiError } = require("../helpers");
const { createCheckoutSessions, construct } = require("../helpers/stripe");
const { PaymentHistory } = require("../models/paymentHistory");
const { Wallet } = require("../models/wallet");
const mongoose = require('mongoose')
class WalletController {

  constructor() {
    this.paymentHistory =  PaymentHistory
    this.wallet = Wallet
    this.paymentHistory.watch().on('change', async change => {
      console.log('Transactions:', change);
      try {
          let status = '';
          console.log(change)
          if (change.operationType === 'create') {
            if( status ) {
              const isWalletExist  = await this.wallet.findOne({createdBy: user.createdBy})
              if( isWalletExist ) {
                const credit = isWalletExist.credit + price
                await this.wallet.updateOne({createdBy: user.createdBy}, { credit })
                //add transcations
              }
              else {
                const wallet =  await this.wallet.create({
                  paymentId: change.documentKey._id,
                  status: status,
                  credit: price,
                  createdBy: user.createdBy
                });
                //add transcations
              }
             
              console.log('credit added')
            }
          }

        } catch (error) {
          console.error('Error saving wallet:', error);
        }
    })  
  }

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
      let event;
      try {
        event = await construct(req.body, sig, endpointSecret);
      } catch (err) {
        throw new Error(err)
      }
      const { type , data: { object: eventObj }} = event
      console.log('-----webhooks----')
      console.log(event)
      if(type === 'checkout.session.completed' && eventObj.payment_status === 'paid' && eventObj.status === 'complete'){
        const r = await user_instances.findOneAndUpdate(
          {
            _id: eventObj.client_reference_id
          }, 
          {
            paymentIntentId: eventObj.payment_intent,
            isActive: true,
            expiresAt: new Date().setDate(new Date().getDate() + 30)
          },
          {
            new: true
          }
        )
  
        userInstanceEvents.emit('payment', eventObj.client_reference_id)
        return res.send({ data: r });
      }
    } catch (e) {
      next(e)
    }
  }

  async useCredit(req, res, next ) {
    try {
      const { credit, service } = req.body
      const wallet = await this.findOne( { createdBy: req.user.userId } )
      if( wallet.price < Number(credit)) {
        throw new ApiError(null,'Insufficient credit', 402)
      }
      const updateCredit = price - credit
      const item = await this.wallet.updateOne({ userId: req.user.userId}, { credit, service, updateCredit })
      //add transcations
      res.sendSuccessResponse( item )
      } catch (e) {
      next(e)
    }
  }

  async getWallet(req, res, next ) {
    try {
      const item = await this.wallet.findOne({createdBy: req.user.userId})
      res.sendSuccessResponse(item)
    } catch (e) {
      next(e)
    }
  }
  
}

module.exports = {WalletController: new WalletController()}