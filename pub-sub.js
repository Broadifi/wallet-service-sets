const Redis = require('ioredis');

class PubSubClient {
    /**
     * Constructs a PubSub client.
     * @param {Object} redisConfig - The config object for Redis clients.
     * @throws {Error} If there is an error when connecting to Redis.
     */
    constructor(redisConfig) {
        this.pubClient = new Redis(redisConfig);
        this.subClient = new Redis(redisConfig);
        this.pubClient.on('error', (err) => {
            throw err
        });
        this.events = new Set(); // stores unique events
        setInterval(this.checkUnacknowledgedMessages, 5000); // Retry unacknowledged messages every 10 seconds
    };

    /**
     * Publishes a message to a specified event. The message is stored in a
     * Redis List and published to all subscribers of the event.
     * @param {string} event - The name of the event to publish to
     * @param {object|string} message - The message to publish
     */
    async emit(event, message) { 
        const messageData = JSON.stringify({ id: Date.now(), message });
        this.pubClient.publish(event, messageData);
        await this.pubClient.lpush(event, messageData);
        this.events.add(event);
    }

    /**
     * Subscribes to an event and listens for messages on the specified
     * channel. When a message is received, it is acknowledged and removed
     * from the Redis List, and the callback is called with the message.
     * @param {string} event - The name of the event to subscribe to
     * @param {function} callback - The callback to call when a message is received
     */
    async on(event, callback) {
        this.subClient.subscribe(event, (err) => {
            if (err) {
                throw new Error('Failed to subscribe:', err);
            }
        });
        this.events.add(event);
        this.subClient.on('message', async (channel, messageData) => {
            if(channel === event){
                const { id, message } = JSON.parse(messageData);
                await this.acknowledgeMessage(channel, id);   // Acknowledge the message
                callback(message);
            }
        });
    }

    // Acknowledge and remove the message from Redis List based on ID
    async acknowledgeMessage(event, messageID) {
        const messageInQueue = await this.pubClient.lrange(event, 0, -1);
        for (let i = 0; i < messageInQueue.length; i++) {
            const { id } = JSON.parse(messageInQueue[i]);
            if (id === messageID) {
                await this.pubClient.lrem(event, 1, messageInQueue[i]); // Remove the message
            }
        }
    };

    // Check unacknowledged messages and retry publishing them
    checkUnacknowledgedMessages = async () => {
        for (const event of this.events) {
            const messageInQueue = await this.pubClient.lrange(event, 0, -1);  // get list of messages
            if (messageInQueue.length > 0) {
                for (const message of messageInQueue) {
                    this.pubClient.publish(event, message);  // Republish the message
                }
            }
        }
    };
}

module.exports = { PubSubClient };
