const { instanceType } = require("../../config")
const { ApiError } = require("../helpers")
const { instanceConfig } = require("../models/instance")


class instaceConfigController {
    async getAll( req, res, next ) {
        try {
            const { type } = req.query
            if( !type ||  !instanceType.includes(type)  ) {
                throw new ApiError('VALIDATION_ERROR', 'Send proper type')
            }
            const items = await instanceConfig.find({ availableFor: type }, { resources: 0} ).lean()
            res.sendSuccessResponse( items )
        } catch (e) {
            next(e)
        }
    }

    async get(req, res, next ) {
        try {
            const item = await instanceConfig.findById(req.params.id, { resources: 0} )
            res.sendSuccessResponse( item )
        } catch (e) {
            next(e)
        }
    }

}

module.exports = { instaceConfigController: new instaceConfigController()}