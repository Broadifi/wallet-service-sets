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



// async function createStripeCustomer( name, email ) {
//     try {
//         const customer = await stripe.customers.create({
//             name: name,
//             email: email
//             });
//         return customer
//     } catch (e) {
//         throw e
//     }
// }


async function construct(body, sig, endpointSecret){
    try {
        const event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
        return event
    } catch (error) {
        throw error
    }
}




// async function addCardDetails(userId, data) {
//     try {

//         // create token is giving error 402
//         // const user = await User.findOne( {
//         //     where: { 'id': userId }
//         // })

//         const customerSource = await stripe.customers.createSource(user.stripe_cust_id, {
//             source: 'tok_visa',
//         });

//         console.log(customerSource);

//         const card = {
//             token: customerSource.id,
//             // user_id: userId, // Assuming userId is already a number
//             last4: customerSource.last4,
//             brand: customerSource.brand,
//             exp_month: customerSource.exp_month,
//             exp_year: customerSource.exp_year,
//             name: customerSource.name,
//             custId: customerSource.id,
//         };

//         const item = await Cards.create(card);
//         return item;
//     } catch (e) {
//         throw e;
//     }
// }
// switch (event.type) {
//   case 'checkout.session.async_payment_failed':
//     const checkoutSessionAsyncPaymentFailed = event.data.object;
//     // Then define and call a function to handle the event checkout.session.async_payment_failed
//     break;
//   case 'checkout.session.async_payment_succeeded':
//     const checkoutSessionAsyncPaymentSucceeded = event.data.object;
//     // Then define and call a function to handle the event checkout.session.async_payment_succeeded
//     break;
//   case 'checkout.session.completed':
//     const checkoutSessionCompleted = event.data.object;
//     // Then define and call a function to handle the event checkout.session.completed
//     break;
//   case 'checkout.session.expired':
//     const checkoutSessionExpired = event.data.object;
//     // Then define and call a function to handle the event checkout.session.expired
//     break;
//   // ... handle other event types
//   default:
//     console.log(`Unhandled event type ${event.type}`);
// }

module.exports = { createCheckoutSessions, construct}