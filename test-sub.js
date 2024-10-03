const { PubSubClient } = require("./pub-sub");
const { redisConf } = require('./config');

const client = new PubSubClient(redisConf)

client.on('startBill', (m) => {
    console.log(m) 
});

client.on('stopBill', (m) => {
    console.log(m) 
});
