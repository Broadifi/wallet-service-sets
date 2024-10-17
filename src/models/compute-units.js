const mongoose = require('mongoose');
const { computeUnitsTypes } = require('../../config');
class ComputeUnits {
    schema = new mongoose.Schema({
        name: {
            type: String,
            required: true,
            unique: true
        },
        hourlyRate: {
            type: String,
            required: true,
            min: 0
        },
        availableFor: {
            type: String,
            enum: computeUnitsTypes
        },
        currency: {
            type: String,
            default: 'USD'
        },
        resources: {
            limits: Object,
            requests: Object
        },
        vCPU: String,
        RAM: Number, // in MB
        description: String,
        images: [String],
        features: {
            type: Object,
            default: {}
        }
    });


  getModel() {
    return mongoose.model('compute_units', this.schema);
  }
}

module.exports = { computeUnits: new ComputeUnits().getModel() };