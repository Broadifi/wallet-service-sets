const { formatHours } = require("../helpers");
const { Billing } = require("../models/billing");
const { Wallet } = require("../models/wallet");
const { paymentsController } = require("../controllers/payments");
class WalletController {

  constructor() {
    paymentsController.events.on('payment', async (userId, amount) => {
      const r = await this.updateWalletCredit(userId, amount);
      console.log(r)
    })
  }


  async updateWalletCredit(userId, amount) {
    return (await Wallet.updateOne({ createdBy: userId }, { $inc: { credit: Number(amount) } }, { upsert: true, new: true }));
  }

  async getWallet(req, res, next) {
    try {
      let item = await Wallet.findOne({ createdBy: req.user.userId }, { status: 1, credit: 1, _id: 0, currency: 1 }).lean()
      if (!item) {
        item = (await Wallet.create({ createdBy: req.user.userId })).toJSON()
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