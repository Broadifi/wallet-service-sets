const { PubSubClient } = require("./pub-sub");
const { redisConf } = require('./config');

const client = new PubSubClient(redisConf)
// client.emit('startBill', { message: 'hello' });

for (let i = 0; i < 10; i++) {
    client.emit('startBill', { message: 'startBill' + i });
    client.emit('stopBill', { message: 'stopBill' + i });
}

console.log('emitted 10 messages')