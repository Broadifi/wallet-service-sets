const jwt = require('jsonwebtoken');
const { ApiError } = require('../helpers');

function extractToken(req) {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  } if (req.query && req.query.token) {
    return req.query.token;
  }
  return null;
}

async function checkLogin(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new ApiError('UNAUTHORIZED_ERROR');
    }
    req.user = jwt.decode(token);
    req.authorized = true;
    req.token = token;
    next();
  } catch (e) {
    next(e);
  }
}
module.exports = { checkLogin };
