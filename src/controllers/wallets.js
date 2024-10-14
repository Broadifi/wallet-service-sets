const { formatHours } = require("../helpers");
const { Billing } = require("../models/billing");
const { Wallet } = require("../models/wallet");
const { paymentsController } = require("../controllers/payments");
class WalletController {

  constructor() {
    paymentsController.events.on('payment', async (userId, amount) => {
      await this.updateWalletCredit(userId, amount);
    })
  }


  async updateWalletCredit(userId, amount) {
    try {
      const wallet = await Wallet.findOne({ owner: userId });
      let currentCredit = wallet ? parseFloat(wallet.credit) : 0;
      currentCredit += amount;
      return (await Wallet.updateOne({ owner: userId }, { credit: currentCredit.toString() }, { upsert: true, new: true }));
    } catch (e) {
      console.log(e)
    }
  }

  async getWallet(req, res, next) {
    try {
      let item = await Wallet.findOne({ owner: req.user.userId }, { _id: 0 }).lean()
      if (!item) {
        item = (await Wallet.create({ owner: req.user.userId })).toJSON()
      }
      item.credit = parseFloat(parseFloat(item.credit).toFixed(2))

      const activeBills = await Billing.find({ isActive: true, userId: req.user.userId }).lean();
      let costPerHour = 0;
      let timeleftInHour = null;

      if (activeBills.length !== 0) {
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