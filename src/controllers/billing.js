const { ApiError, formatHours, float } = require("../helpers")
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
                    _id: String(item._id).slice(-4),
                    isActive: item.isActive,
                    name: item.usedBy.name,
                    type: item.usedBy.type,
                    deployedOn: item.instanceType.name,
                    hourlyRate: item.hourlyRate,
                    startTime: item.startTime,
                    endTime: item.endTime || null,
                    hourUsed: formatHours(item.durationHours),
                    total: float(float(item.totalCost).toFixed(4)),
                    currency: item.instanceType.currency
                }
            })
            res.sendSuccessResponse( result, { totalCount, hasNext, page } )
        } catch (e) {
            console.log(e)
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
    
            const costPerHour = activeBills.reduce((acc, bill) => {
                return acc + parseFloat(bill.hourlyRate);
            }, 0);
            const ExpectedMonthlyCost = costPerHour * 24 * 30;
    
            const totalSpentData = await Billing.find({ userId: req.user.userId }).lean();
            const totalSpent = totalSpentData.reduce((acc, bill) => {
                return acc + parseFloat(bill.totalCost);
            }, 0);
    
            res.sendSuccessResponse({ activeBillsCount: activeBills.length, costPerHour , ExpectedMonthlyCost: parseFloat( ExpectedMonthlyCost.toFixed(2)), totalSpent, currency: "USD" });
        } catch (e) {
            next(e);
        }
    }
    
}

module.exports = { billingController: new billingController()}