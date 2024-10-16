const cors = require('cors');
const humanizeString = require('humanize-string');
const { SendSuccessResponse, ApiError } = require('./helpers');
const { formatMongooseError } = require('./helpers');
const { WalletRoutes } = require('./routes/wallet');
const { computeUnitsRoute } = require('./routes/compute-units');
const { BillingRoutes } = require('./routes/billing');
const { paymentsController } = require('./controllers/payments');
const { PaymentsRoutes } = require('./routes/payments');

class App {
  /**
   * @param {Object} param
   * @param {Object} param.config
   * @param {Number} param.config.port
   * @param {Function} param.express
   */
  constructor({ config, express }) {
    this.config = config;
    this.express = express;
  }

  /**
   * Initialize the application
   */
  init() {
    const app = this.express();
    app.use(cors({ origin: '*' }));
    app.use((req, res, next) => {
      res.sendSuccessResponse = SendSuccessResponse;
      next();
    });
    app.post('/api/v1/payments/webhook', this.express.raw({ type: 'application/json' }), paymentsController.webhook)
    app.use(this.express.json());
    app.get('/', (req, res) => {
      res.sendSuccessResponse({
        status: 200,
        success: true,
        message: 'Billing Tracker API',
      });
    });

    app.use('/api/v1/wallet', WalletRoutes)
    app.use('/api/v1/compute-units', computeUnitsRoute)
    app.use('/api/v1/billings', BillingRoutes)
    app.use('/api/v1/payments', PaymentsRoutes)

    app.use('/*', (req, res, next) => {
      const error = new ApiError('NOT_FOUND_ERROR');
      next(error);
    });

    // eslint-disable-next-line
    app.use((err, req, res, next) => {
      if (!(err instanceof ApiError)) {
        if ( err.name === 'ValidationError' && err.errors ) {
          err.statusCode = 422;
          err.errors = formatMongooseError( err.errors );
          err.message = humanizeString( err.message.split( ':' )[ 0 ].trim() );
          const keys = Object.keys(err.errors)
          err = new ApiError('VALIDATION_ERROR', err.errors[keys], null, err.errors);
        } else {
          err = new ApiError(err.message);
        }
      }
      if(process.env.NODE_ENV === 'production') {
        console.error( `[${new Date().toISOString()}]`, req.method, req.url, err.statusCode, err.message);
      } else {
        console.error( `[${new Date().toISOString()}]`, req.method, req.url, err.statusCode, err.message, `\n${err.stack}`);
      }
      res.statusCode = err.statusCode;
      res.json(err);
    });


    const port = this.config.port || 3000;
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}\nPress CTRL+C to stop it`);
    });
  }
}

module.exports = { App };
