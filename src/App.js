const bodyParser = require('body-parser');
const { SendSuccessResponse, ApiError } = require('./helpers');
const { formatMongooseError } = require('./helpers');
const { WalletRoutes } = require('./routes/wallet');
const { InstacesRoute } = require('./routes/instances');
const { BillingRoutes } = require('./routes/billing');
const { billingTrackerQueue } = require('./helpers/queue');
const cors = require('cors');

/**
 * Node.js App Class
 */
class App {
  /**
   * @param {Object} param
   * @param {Object} param.config
   * @param {Number} param.config.port
   * @param {Function} param.express
   */
  constructor({
    config,
    express,
  }) {
    this.config = config;
    this.express = express;
  }

  /**
   * Initialize the application
   */
  init() {
    const app = this.express();

    app.use(bodyParser.json());
    app.use(cors({ origin: '*' }));
    app.use((req, res, next) => {
      res.sendSuccessResponse = SendSuccessResponse;
      next();
    });

    app.get('/', (req, res) => {
      res.sendSuccessResponse('Hello World');
    });

    app.use('/api/v1/wallets', WalletRoutes)
    app.use('/api/v1/instances', InstacesRoute)
    app.use('/api/v1/billings', BillingRoutes)

    app.use('/*', (req, res, next) => {
      const error = new ApiError('NOT_FOUND_ERROR');
      next(error);
    });

    // eslint-disable-next-line
    app.use((err, req, res, next) => {
      // console.log(err);
      // Check if error is not an instance of ApiError
      if (!(err instanceof ApiError)) {

          if ( err.name === 'ValidationError' && err.errors ) {
              err.statusCode = 422;
              // eslint-disable-next-line no-use-before-define
              err.errors = formatMongooseError( err.errors );
              err.message = humanizeString( err.message.split( ':' )[ 0 ].trim() );

              // eslint-disable-next-line no-param-reassign
              const keys = Object.keys(err.errors)
              // err = new ApiError('VALIDATION_ERROR', err.message, null, err.errors); 
              //frontend wanted to be this way
              err = new ApiError('VALIDATION_ERROR', err.errors[keys], null, err.errors);
          } else {
              // Convert this error into ApiError
              // eslint-disable-next-line no-param-reassign
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
      // eslint-disable-next-line no-console
      console.log(`Server running on http://localhost:${port}\nPress CTRL+C to stop it`);
    });
  }
}

module.exports = {
  App,
};
