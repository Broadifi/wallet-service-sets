const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');
const { ApiError } = require('../helpers');
const config = require('../../config');

const extractToken = ( req ) => {
  if ( req.headers.authorization && req.headers.authorization.split( ' ' )[ 0 ] === 'Bearer' ) {
      return req.headers.authorization.split( ' ' )[ 1 ];
  } else if ( req.query && req.query.token ) {
      return req.query.token;
  }
  throw new ApiError('VALIDATION_ERROR', 'Token is required');
};

const getSigningKey = async ( token ) => {
  try {
      const jwksClient = jwksRsa({
          jwksUri: config.jwksUri, //
          caches: true,
          rateLimit: true
      });
      const { kid } = jwt.decode(token, { complete: true }).header;
      const key = await jwksClient.getSigningKey(kid);
      return key.getPublicKey();
  } catch (error) {
      throw new ApiError('UNAUTHORIZED_ERROR', 'JWT invalid')
  }
};

const checkLogin = async( req, res, next ) => {
  try {
      const token = extractToken( req );
      const signingKey = await getSigningKey( token );
      req.user = jwt.verify(token, signingKey, { algorithms: [ 'RS256' ] });
      if( !req.user.userId ){
          throw new ApiError('PERMISSION_DENIED_ERROR', 'Invalid User ID');
      }
      req.authorized = true;
      req.token = token;
      next();
  } catch ( e ) {
      next( new ApiError('UNAUTHORIZED_ERROR', e.message) );
  }
};
module.exports = { checkLogin };
