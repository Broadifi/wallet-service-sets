const { instanceType } = require("../../config")
const { ApiError, formatHours } = require("../helpers")
const { Billing } = require("../models/billing")
const mongoose = require("mongoose")


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

            const result = []
            for( let item in items ) {
                console.log(item)
                // const collection = mongoose.connection.db.collection(item.usedBy?.type)
                // const document = await collection.findOne({_id: new mongoose.mongo.ObjectId(item.usedBy?.id) })
                // console.log(document)
                // result.push({
                //     _id: (item._id).slice(-4),
                //     isActive: item.isActive,
                //     name: (document.name).includes('/') ? (document.name).split('/')[1] : document.name,
                //     type: item.usedBy?.type,
                //     deployedOn: item.instanceType.name,
                //     startTime: item.startTime,
                //     endTime: item.endTime || null,
                //     hourUsed: formatHours(item.durationHours),
                //     total: parseFloat(item.totalCost),
                //     currency: item.instanceType.currency
                // })
            }
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