const { PubSubPlus } = require("./pub-sub");
const { PubPlus, SubPlus } = require("./test");
const { redisConf } = require('./config');


// const client = new PubSubPlus(redisConf)
const client = new PubPlus(redisConf)
client.on('error', (err) => {
    console.log(err);
})

for (let i = 0; i < 1; i++) {
    client.emit('startBill', { message: ['startBill-' + i] });
    // client.emit('stopBill', { message: 'stopBill' + i });
}

console.log('emitted')
