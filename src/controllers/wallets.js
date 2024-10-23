const { float } = require("../helpers");
const { Wallet } = require("../models/wallet");
const EventEmitter = require('events');

class WalletController {

  constructor() {
    this.events = new EventEmitter();
  }

  async updateWalletCredit(userId, amount) {
    try {
      const wallet = await Wallet.findOne({ owner: userId });
      let currentCredit = wallet ? float(wallet.credit) : 0;
      currentCredit += amount;
      await Wallet.updateOne({ owner: userId }, { credit: currentCredit.toString() }, { upsert: true, new: true });
      this.events.emit('wallet:updated', userId);
    } catch (e) {
      console.log(e)
    }
  }

  async getWallet(req, res, next) {
    try {
      let userWallet = await Wallet.findOne({ owner: req.user.userId }, { _id: 0 }).lean()
      if (!userWallet) {
        userWallet = (await Wallet.create({ owner: req.user.userId })).toJSON()
      }
      userWallet.credit = float(userWallet.credit);
      const { status, credit, currency, currentMonthSpent, lastMonthSpent } = userWallet;

      res.sendSuccessResponse(
        {
          status, 
          credit,
          currency,
          currentMonthSpent,
          lastMonthSpent
        }
      )
    } catch (e) {
      next(e)
    }
  }

}

module.exports = { WalletController: new WalletController() }