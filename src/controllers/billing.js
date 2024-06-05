const { instanceType } = require("../../config")
const { ApiError } = require("../helpers")
const { Billing } = require("../models/billing")


class billingController {

    async getAll( req, res, next ) {
        try {
            const items = await Billing.find({ userId: req.user.userId } ) 
            res.sendSuccessResponse( items )
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

}

module.exports = { billingController: new billingController()}