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

// Subscribe to a channel
redisClient.subscribe('testChannel', (err, count) => {
    if (err) {
        console.error('Failed to subscribe:', err);
    } else {
        console.log(`Subscribed to ${count} channel(s). Listening for updates on testChannel...`);
    }
});

// Listen for messages on the channel
redisClient.on('message', (channel, message) => {
    console.log(`Received message from ${channel}: ${message}`);
});
