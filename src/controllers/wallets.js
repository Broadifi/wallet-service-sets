const { ApiError, formatHours } = require("../helpers");
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const { Billing } = require("../models/billing");
const { payments } = require("../models/payments");
const { Wallet } = require("../models/wallet");
const mongoose = require('mongoose')
class WalletController {


  async createCheckout( req, res, next ) {
    try {
      const { amount } = req.body
      const userCollection = mongoose.connection.db.collection('users');
      const user = await userCollection.findOne({_id: new mongoose.mongo.ObjectId(req.user.userId) })
      if( !user ) {
        throw new ApiError('NOT_FOUND_ERROR', 'User not found')
      }

      const session = await stripe.checkout.sessions.create(
        {
          payment_method_types: ['card'],
          mode: 'payment',
          success_url: process.env.STRIPE_SUCESS,
          cancel_url: process.env.STRIPE_FAILED,
          customer_email: user.email,
          client_reference_id: req.user.userId,
          line_items: [{
            price_data: {
              currency: 'USD',
              unit_amount: amount * 100,
              product_data: {
                name: 'Credit',
                images: ['https://img.freepik.com/free-vector/e-wallet-concept-illustration_114360-7957.jpg?t=st=1727113595~exp=1727117195~hmac=ecd8a99b3d22456ebc9945c85255453ad5ede5956dcacc36664a4ff5197fdb6d&w=1060']  
              }     
  
            },
            quantity: 1
          }]
        }
      );

      // create payment document using stripe session
      await payments.create({
        amount: session.amount,
        payment_status: session.payment_status,
        status: session.status,
        currency: session.currency,
        createdBy: req.user.userId,
        exipresAt: session.expires_at

      })

      res.sendSuccessResponse({
        data: {
          stripeCheckoutId: session.id,
          redirectUrl: session.url 
        }
      })
    } catch (e) {
      console.log(e)
      next(e)
    }
  }
  /** TODO
   * add payment history
   */
  async webhook (req, res, next) {
    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
      const sig = req.headers['stripe-signature'];
      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err) {
        throw new Error(err)
      }
      const { type , data: { object: eventObj }} = event
      if(type === 'checkout.session.completed' && eventObj.payment_status === 'paid' && eventObj.status === 'complete'){
        // update payment history document
        await payments.updateOne({ createdBy: eventObj.client_reference_id }, { status: 'complete', exipresAt: eventObj.expires_at, payment_status: 'paid' })
        
        // update wallet document
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

      res.sendSuccessResponse({ status, credit, currency, currentSpending: costPerHour, timeleftInHour })
    } catch (e) {
      next(e)
    }
  }

}

module.exports = { WalletController: new WalletController() }