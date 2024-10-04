const { PubSubPlus } = require("./pub-sub");
const { redisConf } = require('./config');

const client = new PubSubPlus(redisConf)

client.on('startBill:deployment', (m) => {
    console.log(m) 
});

client.on('stopBill', (m) => {
    console.log(m) 
});
