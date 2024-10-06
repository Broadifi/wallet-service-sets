const { PubSubPlus } = require("./pub-sub");
const { PubPlus, SubPlus } = require("./test");
const { redisConf } = require('./config');

// const client = new PubSubPlus(redisConf)
const client = new SubPlus(redisConf)
const x =1
client.on('startBill', (m, ack) => {
    console.log(m, x);
    // ack(); 
});

// client.on('error', (m) => {
//     console.log(m);
// });

// client.on('stopBill', (m, ack) => {
//     console.log(m) 
//     // ack()
// });
