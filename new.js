const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class RedisPubSubSystem {
  constructor(redisUrl) {
    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
    this.redis = new Redis(redisUrl);
    this.channelQueues = {};
    this.processingSet = 'processing_set';
    this.deadLetterQueue = 'dead_letter_queue';
    this.maxRetries = 3;
    this.retryInterval = 60000; // 1 minute
  }

  async publish(channel, message) {
    const id = uuidv4();
    const queuedMessage = JSON.stringify({ id, message, retries: 0 });
    
    await Promise.all([
      this.publisher.publish(channel, queuedMessage),
      this.redis.lpush(this.getQueueName(channel), queuedMessage)
    ]);

    console.log(`Published message ${id} to channel ${channel}`);
  }

  subscribe(channel, messageHandler) {
    this.subscriber.subscribe(channel);
    this.subscriber.on('message', async (receivedChannel, message) => {
      if (receivedChannel === channel) {
        const parsedMessage = JSON.parse(message);
        console.log(`Received message ${parsedMessage.id} from channel ${channel}`);
        
        await this.redis.sadd(this.processingSet, parsedMessage.id);
        
        try {
          await messageHandler(parsedMessage.message);
          await this.acknowledgeMessage(channel, parsedMessage.id);
        } catch (error) {
          console.error(`Error processing message ${parsedMessage.id}:`, error);
          await this.redis.srem(this.processingSet, parsedMessage.id);
        }
      }
    });
  }

  async acknowledgeMessage(channel, messageId) {
    const queueName = this.getQueueName(channel);
    await Promise.all([
      this.redis.lrem(queueName, 0, messageId),
      this.redis.srem(this.processingSet, messageId)
    ]);
    console.log(`Acknowledged message ${messageId} from channel ${channel}`);
  }

  async retryUnacknowledgedMessages() {
    for (const channel of Object.keys(this.channelQueues)) {
      const queueName = this.getQueueName(channel);
      const messages = await this.redis.lrange(queueName, 0, -1);
      
      for (const message of messages) {
        const parsedMessage = JSON.parse(message);
        if (!await this.redis.sismember(this.processingSet, parsedMessage.id)) {
          parsedMessage.retries += 1;
          
          if (parsedMessage.retries > this.maxRetries) {
            await this.moveToDeadLetterQueue(channel, parsedMessage);
          } else {
            const updatedMessage = JSON.stringify(parsedMessage);
            await Promise.all([
              this.publisher.publish(channel, updatedMessage),
              this.redis.lrem(queueName, 0, message),
              this.redis.lpush(queueName, updatedMessage)
            ]);
            console.log(`Retried message ${parsedMessage.id} on channel ${channel}`);
          }
        }
      }
    }
  }

  async moveToDeadLetterQueue(channel, message) {
    const queueName = this.getQueueName(channel);
    await Promise.all([
      this.redis.lrem(queueName, 0, JSON.stringify(message)),
      this.redis.lpush(this.deadLetterQueue, JSON.stringify({ channel, ...message }))
    ]);
    console.log(`Moved message ${message.id} to dead letter queue`);
  }

  getQueueName(channel) {
    if (!this.channelQueues[channel]) {
      this.channelQueues[channel] = `queue:${channel}`;
    }
    return this.channelQueues[channel];
  }

  startRetryProcess() {
    setInterval(() => this.retryUnacknowledgedMessages(), this.retryInterval);
  }
}

// Usage example
const redisUrl = 'redis://localhost:6379';
const pubSubSystem = new RedisPubSubSystem(redisUrl);

// Start the retry process
pubSubSystem.startRetryProcess();

// Publisher
setInterval(() => {
  pubSubSystem.publish('test-channel', `Hello, world! ${new Date().toISOString()}`);
}, 5000);

// Subscriber
pubSubSystem.subscribe('test-channel', async (message) => {
  console.log('Processing message:', message);
  // Simulate processing time and random errors
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  if (Math.random() < 0.1) throw new Error('Random processing error');
});



const Redis = require('ioredis');

class PubSubPlus {
    /**
     * Constructs a PubSub client.
     * @param {Object} redisConfig - The config object for Redis clients.
     * @throws {Error} If there is an error when connecting to Redis.
     */
    constructor(redisConfig) {
        this.pubClient = new Redis(redisConfig);
        this.subClient = new Redis(redisConfig);
        this.addEvents(this.pubClient);
        this.addEvents(this.subClient);
        this.pubClient.on('error', (err) => {
            throw err
        });
        this.events = new Set(); // stores unique events
        setInterval(this.checkUnacknowledgedMessages, 5000); // Retry unacknowledged messages every 5 seconds
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
                await callback(message);
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

    addEvents(redisClient){
        // Log successful connection
        redisClient.on('connect', () => {
            console.log('Connected to Redis');
        });

        // Log Redis is ready to use
        redisClient.on('ready', () => {
            console.log('Redis client ready');
        });

        // Handle reconnection attempts
        redisClient.on('reconnecting', () => {
            console.log('Reconnecting to Redis...');
        });

        // Handle errors in Redis connection
        redisClient.on('error', (err) => {
            console.error('Redis error:', err);
        });

        // Log when Redis connection is closed
        redisClient.on('end', () => {
            console.log('Redis connection closed');
        });
    }
}

module.exports = { PubSubPlus };
