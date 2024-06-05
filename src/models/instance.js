const mongoose = require('mongoose');
class InstanceConfig {
    schema = new mongoose.Schema({
        name: {
            type: String,
            required: true,
            unique: true
        },
        hourlyRate: {
            type: Number,
            required: true,
            min: 0
        },
        availableFor: {
            type: String,
            enum: ['static', 'backend', 'instance']
        },
        currency: {
            type: String,
            default: 'USD'
        },
        vCPU: Number,
        RAM: Number, // in MB
        description: String,
        images: [String],
        features: {
            type: Object,
            default: {}
        }
    });


  getModel() {
    console.log('InstanceConfig model created');
    return mongoose.model('instance-config', this.schema);
  }
}

module.exports = { instanceConfig: new InstanceConfig().getModel() };