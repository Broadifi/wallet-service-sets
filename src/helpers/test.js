const { publisher, subscriber } = require('./pub-sub');

publisher.emit('start-billing', {
    id: '666049ee9354447f4740fa5f', 
    type: 'instance', 
    name: 'test', 
    deployedOn: '666049ee9354447f4740fa5d', 
    createdBy: '655c6921d80902db98b84385', 
    createdAt: '2024-10-15T19:42:04.257+00:00'
})

subscriber.on('stop-billing', (billingInfo, ack) => {
    console.log(billingInfo);
    ack();
})