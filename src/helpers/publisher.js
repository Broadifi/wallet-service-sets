const { Redis } = require('ioredis');
const { redisConf } = require('../../config');

const redisClient = new Redis(redisConf);
redisClient.on('error', (err) => {
     console.log('[Redis Error] =>', err.message);
});

redisClient.on('close', () => {
    // console.log('[Redis Error] =>', 'Redis connection closed');
});


function publishMessage(channel, msg ) {
    try {
        redisClient.publish(channel, msg, (err) => {
            if (err) {
                throw new Error(err);
            }
        });
    } catch (err) {
        console.error('Error publishing message:', err);
    }
}

module.exports = { publishMessage }
