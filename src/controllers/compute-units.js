const { computeUnitsTypes } = require("../../config")
const { ApiError } = require("../helpers")
const { computeUnits } = require("../models/compute-units")


class computeUnitsController {
    async getAll( req, res, next ) {
        try {
            const { type } = req.query
            if( !type ||  !computeUnitsTypes.includes(type)  ) {
                throw new ApiError('VALIDATION_ERROR', 'invalid type')
            }
            const items = await computeUnits.find({ availableFor: type }, { resources: 0 }).lean()
            res.sendSuccessResponse( items )
        } catch (e) {
            next(e)
        }
    }

    async get(req, res, next ) {
        try {
            const item = await computeUnits.findById(req.params.id, { resources: 0 })
            res.sendSuccessResponse( item )
        } catch (e) {
            next(e)
        }
    }

}

module.exports = { computeUnitsController: new computeUnitsController()}