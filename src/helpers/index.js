const { SendSuccessResponse } = require('./response.success');
const { ApiError } = require('./response.error');
const moment = require('moment');
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

function formatHours(hoursDecimal) {
  const duration = moment.duration(hoursDecimal, 'hours');
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();

  const hoursPart = hours > 0 ? `${hours} hour${hours !== 1 ? 's' : ''}` : '';
  const minutesPart = minutes > 0 ? `${minutes} minute${minutes !== 1 ? 's' : ''}` : '';

  if (hoursPart && minutesPart) {
    return `${hoursPart} ${minutesPart}`;
  } else if (hoursPart) {
    return hoursPart;
  } else if (minutesPart) {
    return minutesPart;
  } else {
    return '0 minutes';
  }
}

const float = (value) => parseFloat(value);

module.exports = { SendSuccessResponse, ApiError, formatMongooseError, formatHours, float };

