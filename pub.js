const { Redis } = require('ioredis');
const { redisConf } = require('./config');

const redisClient = new Redis(redisConf);

// Handle Redis errors
redisClient.on('error', (err) => {
    console.log('[Redis Error] =>', err.message);
});

// Handle Redis connection close
redisClient.on('close', () => {
    console.log('[Redis Connection Closed]');
});

function publishMessage(channel, msg) {
    try {
        redisClient.publish(channel, msg, (err) => {
            if (err) {
                throw new Error(err);
            }
            console.log(`Message published to ${channel}: ${msg}`);
        });
    } catch (err) {
        console.error('Error publishing message:', err);
    }
}

// module.exports = { publishMessage };

// Example usage
for (let i = 0; i < 10; i++) {
    publishMessage('testChannel', JSON.stringify({ name: 'John', age: 30 }));
}
// publishMessage('testChannel', 'Hello Redis!');
