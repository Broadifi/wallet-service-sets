const { Database } = require('./Database');

const paymentRedirectUri = {
      success: 'https://cloud.setside.io/drive/my-servers',
      cancel: 'https://cloud.setside.io/drive/my-servers'
  }


module.exports = {
  Database, 
  instanceType : [ 'static', 'backend', 'instance'],
  jwksUri: 'http://135.181.250.21:9011/.well-known/jwks.json',
};
