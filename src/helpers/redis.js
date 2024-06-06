const { Redis } = require('ioredis');

const redisClient = new Redis({
    port: 19616,
    host: "redis-294cb0c-anirbandas165-d58f.f.aivencloud.com",
    username: "default",
    password: "AVNS_lUCKicURFU9Zz9y1Mg3",
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

