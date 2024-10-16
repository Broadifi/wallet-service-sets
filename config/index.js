const { Database } = require('./Database');

module.exports = {
  Database, 
  computeUnitsTypes : [ 'static', 'backend', 'instance'],
  jwksUri: 'http://135.181.250.21:9011/.well-known/jwks.json',
  redisConfig: {
    port: 19616,
    host: "redis-294cb0c-anirbandas165-d58f.f.aivencloud.com",
    username: "default",
    password: "AVNS_lUCKicURFU9Zz9y1Mg3",
    tls: {},
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ETIMEDOUT'];
      if (targetErrors.includes(err.message)) {
        return true;  // Reconnect on specific error types
      }
      return false;
    },
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  }
};
