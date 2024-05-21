const { SendSuccessResponse } = require('./response.success');
const { ApiError } = require('./response.error');
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

module.exports = { SendSuccessResponse, ApiError, formatMongooseError };

