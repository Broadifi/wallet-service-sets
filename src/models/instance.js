const mongoose = require('mongoose');
const { instanceType } = require('../../config');
class InstancesInfo {
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
            enum: instanceType
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
    return mongoose.model('instances-info', this.schema);
  }
}

module.exports = { instancesInfo: new InstancesInfo().getModel() };