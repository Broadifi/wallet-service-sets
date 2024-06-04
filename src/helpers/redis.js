const { Redis } = require('ioredis');

const redisClient = new Redis({
    port: 26619,
    host: "caching-3fc281a4-animeshd838-2888.f.aivencloud.com",
    username: "default",
    password: process.env.REDIS_PASSWORD,
    tls: {},
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: null,
});


redisClient.on('error', (err) => {
     console.log('[Redis Error] =>', err.message);
});

redisClient.on('close', () => {
    console.log('[Redis Error] =>', 'Redis connection closed');
});

module.exports = { redisClient };

