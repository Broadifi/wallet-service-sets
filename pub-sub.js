const Redis = require('ioredis');

class PubSubClient{
    client = new Redis();
    constructor(channel) {
        this.channel = channel;
    }

    publish = async (channel, message) => {
        const messageData = JSON.stringify({ id: Date.now(), message });
        // Publish the message on Pub/Sub
        this.client.publish(channel, messageData);
        // Store the message in a Redis List (queue) for retry purposes
        await this.client.lpush('message_storage', messageData); // Add message to the head of the queue
    };
    
    subscribe = async (channel) => {
        const pubSubClient = new Redis();
        // Subscribe to the Redis Pub/Sub channel
        pubSubClient.subscribe(channel, (err) => {
            if (err) {
                console.error('Failed to subscribe:', err);
            } else {
                console.log(`Subscribed to channel: ${channel}`);
            }
        });
        pubSubClient.on('message', async (channel, messageData) => {
            const { id, message } = JSON.parse(messageData);
            console.log(`Received message: ${message}`);
            // Acknowledge the message without worrying about the order
            await acknowledgeMessage(id);
        });
    };
    // Acknowledge and remove the message from Redis List based on ID
    const acknowledgeMessage = async (messageID) => {
        const messageInQueue = await redis.lrange('message_queue', 0, -1); // Get all messages from the queue
        for (let i = 0; i < messageInQueue.length; i++) {
            const { id } = JSON.parse(messageInQueue[i]);
            if (id === messageID) {
                // Remove the message regardless of order
                await redis.lrem('message_queue', 1, messageInQueue[i]);
                console.log(`Message ${messageID} acknowledged and removed`);
                break;
            }
        }
    };

}