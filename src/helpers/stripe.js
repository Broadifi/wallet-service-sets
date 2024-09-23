const stripe = require('stripe')(process.env.STRIPE_SECRET);
// const { paymentRedirectUri } = require('./../config');
// require('dotenv').config()


const createCheckoutSessions = async ( price, userId, email ) => {
  try {
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        mode: 'payment',
        success_url: process.env.STRIPE_SUCESS,
        cancel_url: process.env.STRIPE_FAILED,
        customer_email: email,
        client_reference_id: userId,
        line_items: [{
          price_data: {
            currency: 'USD',
            unit_amount: price * 100,
            product_data: {
              name: 'Credit',
              images: ['https://img.freepik.com/free-vector/falling-dollar-coins-success-luck-money-investment-concept_1262-13463.jpg?t=st=1717755281~exp=1717758881~hmac=52d71e79ca0dc6cd78963802ca4ec45b0a61e69daca9dd9b549fb0d56b685e88&w=996']  
            }     

          },
          quantity: 1
        }]
      }
    );

    return { data: {
      stripeCheckoutId: session.id,
      redirectUrl: session.url 
    }}

  } catch (e) {
    throw e  
  }
}

async function construct(body, sig, endpointSecret){
    try {
        const event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
        return event
    } catch (error) {
        throw error
    }
}

module.exports = { createCheckoutSessions, construct}