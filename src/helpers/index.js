const { SendSuccessResponse } = require('./response.success');
const { ApiError } = require('./response.error');
const humanizeString = require('humanize-string');

function formatMongooseError( errorsObj ) {
    const errors = {};
    Object.keys( errorsObj ).forEach( key => {
        switch( errorsObj[ key ].kind ) {
            case 'required': errors[ key ] = `${humanizeString( errorsObj[ key ].path )} is required`;
                break;

            case 'unique': errors[ key ] = `${humanizeString( errorsObj[ key ].path )} already exists`;
                break;

            default:
                if( errorsObj[ key ].name === 'CastError' ) {
                    errors[ key ] = `${humanizeString( errorsObj[ key ].path )} is of invalid type`;
                } else {
                    errors[ key ] = errorsObj[ key ].message;
                }
        }
    } );
    return errors;
};

function formatHours(hours) {
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.ceil(hours % 24);
    return `${days} day${days !== 1 ? 's' : ''}${remainingHours ? `${remainingHours} hour${remainingHours !== 1 ? 's' : ''}` : ''}`;
  } else {
    return `${Math.ceil(hours)} hour${Math.ceil(hours) !== 1 ? 's' : ''}`;
  }
}


function createStripeCheckoutObj( user, amount ){
  return {
    payment_method_types: ['card'],
    mode: 'payment',
    success_url: process.env.STRIPE_SUCESS,
    cancel_url: process.env.STRIPE_FAILED,
    customer_email: user.email,
    client_reference_id: String(user._id),
    line_items: [{
      price_data: {
        currency: 'USD',
        unit_amount: amount * 100,
        product_data: {
          name: 'Credit',
          images: ['https://img.freepik.com/free-vector/e-wallet-concept-illustration_114360-7957.jpg?t=st=1727113595~exp=1727117195~hmac=ecd8a99b3d22456ebc9945c85255453ad5ede5956dcacc36664a4ff5197fdb6d&w=1060']
        }
      },
      quantity: 1
    }]
  }
}

const float = (value) => parseFloat(value);

module.exports = { SendSuccessResponse, ApiError, formatMongooseError, formatHours, float, createStripeCheckoutObj };

