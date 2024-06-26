const { Redis } = require('ioredis');
const { redisConf } = require('../../config');

const redisClient = new Redis(redisConf);
redisClient.on('error', (err) => {
     console.log('[Redis Error] =>', err.message);
});

redisClient.on('close', () => {
    console.log('[Redis Error] =>', 'Redis connection closed');
});

module.exports = { redisClient };

