const { payments } = require('../models/payments');
const cron = require('node-cron')
class PaymentsController {

    constructor() {
        cron.schedule('* * * * *', async () => {
            console.log('Checking for expired documents...');
            try {
                await this.updateExpiredDocuments();
            } catch (error) {
                console.error('Error updating expired documents:', error);
            }
        });
    }
    async getAll( req, res, next ) {
        try {
            const items = await payments.find({ userId: req.user.userId })
            res.sendSuccessResponse( items )
        } catch (e) {
            next(e)
        }
    }

    async updateExpiredDocuments() {
        const currentTime = Math.floor(Date.now() / 1000);
        try {
          const result = await payments.updateMany(
            {
              expiresAt: { $lt: currentTime },
              status: 'open',
            },
            {
              $set: { status: 'complete' },
            }
          );
          console.log(`${result.modifiedCount} documents updated.`);
        } catch (err) {
          console.error('Error updating expired documents:', err);
        }
      }
}


module.exports = { PaymentsController: new PaymentsController() }