const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class PubSubPlus extends EventEmitter {
    constructor(redisConfig) {
        super();
        this.pubClient = new Redis(redisConfig);
        this.subClient = new Redis(redisConfig);
        this.pubClient.on('error', (err) => this.emit('error', err));
        this.subClient.on('error', (err) => this.emit('error', err));
        this.events = new Set();
        this.retryInterval = 10000;
        this.maxRetries = 3;
        // super.on('error', (error) => {
        //     this.emit('error', error);
        // })
        // setInterval(() => this.emit('error', 'Error in PubSub system'), 3000);
        setInterval(() => this.retryUnacknowledgedMessages(), this.retryInterval);
    }

    /**
     * Publishes a message to a specified event. The message is stored in a
     * Redis List and published to all subscribers of the event.
     * @param {string} event - The name of the event to publish to
     * @param {object|string} message - The message to publish
     */
    async emit(event, message) {
        this.events.add(event);
        const messageData = JSON.stringify({ id: uuidv4(), message, retries: 0, timestamp: Date.now() });
        await Promise.all([
            this.pubClient.publish(event, messageData),
            this.pubClient.lpush(`${event}:queue`, messageData)
        ]);
    }

    /**
     * Subscribes to an event and listens for messages on the specified
     * channel. When a message is received, the callback is invoked with the
     * message object and an acknowledgment function. The acknowledgment
     * function should be called to confirm successful processing, which will
     * then remove the message from the Redis List.
     * 
     * @param {string} event - The name of the event to subscribe to.
     * @param {function} callback - An asynchronous callback to call when a message is received.
     *  The callback passed two arguments:
     * - message: The message object received from the channel.
     * - acknowledge: A function to be called after processing
     * the message, which acknowledges and removes the message.
     * 
     * @returns {Promise<void>} A promise that resolves when the callback has been processed.
     */

    async on(event, callback) {
        this.subClient.subscribe(event, (err) => {
            if (err) this.emit('error', new Error(`Failed to subscribe: ${err.message}`));
            this.events.add(event);
        });
        this.subClient.on('message', async (channel, messageData) => {
            if (channel === event) {
                try {
                    const { id, message } = JSON.parse(messageData);
                    await callback(message, async () => await this.acknowledgeMessage(channel, id));
                } catch (error) {
                    this.emit('error', new Error(`Error processing message: ${error.message}`));
                }
            }
        }); 
    }

    async acknowledgeMessage(event, messageID) {
        try {
            const messagesInQueue = await this.pubClient.lrange(`${event}:queue`, 0, -1);
            for (const message of messagesInQueue) {
                const { id } = JSON.parse(message);
                if (id === messageID) {
                    await Promise.all([
                        this.pubClient.lrem(`${event}:queue`, 1, message), // Remove the message
                    ])
                    break;
                }
            }
        } catch (error) {
            this.emit('error', new Error(`Error acknowledging message: ${error.message}`));
        }

    }

    async retryUnacknowledgedMessages() {
        for (const event of this.events) {
            const messages = await this.pubClient.lrange(`${event}:queue`, 0, -1);
            if (messages.length === 0) continue;
            for (const messageData of messages) {
                const parsedMessage = JSON.parse(messageData);
                if (this.maxRetries < parsedMessage.retries) {
                    await this.moveToDeadLetterQueue(event, parsedMessage);
                    continue;
                }
                parsedMessage.retries++;
                await this.pubClient.lrem(`${event}:queue`, 0, messageData);
                await this.pubClient.lpush(`${event}:queue`, JSON.stringify(parsedMessage));
                await this.pubClient.publish(event, JSON.stringify(parsedMessage));
            }
        }
    }

    async moveToDeadLetterQueue(event, message) {
        await Promise.all([
            this.pubClient.lpush('deadLetterQueue', JSON.stringify({ event, ...message })),
            this.pubClient.lrem(`${event}:queue`, 0, JSON.stringify(message))
        ]);
    }
}

module.exports = { PubSubPlus };