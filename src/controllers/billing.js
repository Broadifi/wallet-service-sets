const { instanceType } = require("../../config")
const { ApiError } = require("../helpers")
const { Billing } = require("../models/billing")


class billingController {

    async getAll( req, res, next ) {
        try {
            const page = Math.ceil(req.query.page) || 1
            const limit = Math.ceil(req.query.limit) || 10
            const skip = (page - 1) * limit;
            const items = await Billing.find({ userId: req.user.userId } ).populate('instanceType').sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
            const totalCount = await Billing.countDocuments({ userId: req.user.userId })
            const totalPages = Math.ceil(totalCount / limit);
            const hasNext = page < totalPages;

            const result = items.map( item => {
                return {
                    _id: item._id,
                    type: item.instanceType.availableFor,
                    name: item.instanceType.name,
                    startTime: item.startTime,
                    endTime: item.endTime,
                    hourUsed: item.durationHours,
                    total: parseFloat(item.totalCost),
                    currency: item.instanceType.currency
                }
            })
            res.sendSuccessResponse( result, { totalCount, hasNext, page } )
        } catch (e) {
            next(e)
        }
    }

    async get( req, res, next ) {
        try {
            const item = await Billing.findById(req.params.id)
            res.sendSuccessResponse( item )
        } catch (e) {
            next(e)
        }
    }

    async currentBillingInfo(req, res, next) {
        try {
            const activeBills = await Billing.find({ isActive: true, userId: req.user.userId }).lean();
            console.log(activeBills);
    
            const costPerHour = activeBills.reduce((acc, bill) => {
                return acc + parseFloat(bill.hourlyRate);
            }, 0);
            const ExpectedMonthlyCost = costPerHour * 24 * 30;
    
            const totalSpentData = await Billing.find({ userId: req.user.userId }).lean();
            const totalSpent = totalSpentData.reduce((acc, bill) => {
                return acc + parseFloat(bill.totalCost);
            }, 0);
            console.log(costPerHour, totalSpent, ExpectedMonthlyCost);
    
            res.sendSuccessResponse({ activeBillsCount: activeBills.length, costPerHour , ExpectedMonthlyCost: parseFloat( ExpectedMonthlyCost.toFixed(2)), totalSpent, currency: "USD" });
        } catch (e) {
            next(e);
        }
    }
    
}

module.exports = { billingController: new billingController()}