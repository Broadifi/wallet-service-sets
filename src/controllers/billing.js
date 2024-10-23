const { formatHours } = require("../helpers")
const { Billing } = require("../models/billing");
const { Wallet } = require("../models/wallet");

class billingController {

    async getAll(req, res, next) {
        try {
            const page = Math.ceil(req.query.page) || 1
            const limit = Math.ceil(req.query.limit) || 10
            const skip = (page - 1) * limit;
            const items = await Billing.find({ userId: req.user.userId }).populate('deployedOn').sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
            const totalCount = await Billing.countDocuments({ userId: req.user.userId })
            const totalPages = Math.ceil(totalCount / limit);
            const hasNext = page < totalPages;

            const result = items.map(item => {
                const { status, usedBy, deployedOn, hourlyRate, startTime, endTime = null, durationHours, totalCost } = item;
                return {
                    status,
                    name: usedBy.name,
                    type: usedBy.type,
                    deployedOn: deployedOn.name,
                    currency: deployedOn.currency,
                    hourlyRate,
                    startTime,
                    endTime,
                    hourUsed: formatHours(durationHours),
                    total: totalCost
                }
            })
            res.sendSuccessResponse(result, { totalCount, hasNext, page })
        } catch (e) {
            next(e)
        }
    }

    async get(req, res, next) {
        try {
            const item = await Billing.findById(req.params.id)
            res.sendSuccessResponse(item)
        } catch (e) {
            next(e)
        }
    }

    async currentBillingInfo(req, res, next) {
        try {
            const activeBills = await Billing.find({ status: 'active', userId: req.user.userId }).lean();

            const costPerHour = activeBills.reduce((acc, bill) => {
                return acc + parseFloat(bill.hourlyRate);
            }, 0);
            const expectedMonthlyCost = costPerHour * 24 * 30;
            let userWallet = await Wallet.findOne({ owner: req.user.userId }).lean()
            const timeleftInHour = formatHours(userWallet.credit / costPerHour);

            res.sendSuccessResponse({
                activeBillsCount: activeBills.length,
                costPerHour,
                expectedMonthlyCost,
                currentMonthSpent: userWallet.currentMonthSpent,
                lastMonthSpent: userWallet.lastMonthSpent,
                timeleftInHour,
            });
        } catch (e) {
            next(e);
        }
    }

}

module.exports = { billingController: new billingController() }