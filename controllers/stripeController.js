// Initialize Stripe only if API key is available
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const Order = require('../models/Order');

// Initialize cart helper
const initializeCart = (req) => {
  if (!req.session.cart) {
    req.session.cart = {
      items: [],
      totalPrice: 0
    };
  }
  return req.session.cart;
};

// Calculate total price
const calculateTotal = (cart) => {
  const subtotal = cart.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  
  const tax = subtotal * 0.085; // 8.5% tax
  const total = subtotal + tax;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100
  };
};

// Create Stripe Checkout Session
exports.createCheckoutSession = async (req, res) => {
  try {
    const cart = initializeCart(req);
    
    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    const {
      customerName,
      customerEmail,
      customerPhone,
      deliveryType,
      scheduledDate,
      scheduledTime,
      address,
      specialInstructions
    } = req.body;

    // Validate required fields
    if (!customerName || !customerEmail || !customerPhone || !scheduledDate || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }

    // Calculate totals
    const totals = calculateTotal(cart);
    
    // Create order in database with "Pending Payment" status
    const orderData = {
      items: cart.items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      })),
      totals: {
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total
      },
      delivery: {
        type: deliveryType || 'pickup',
        scheduledFor: new Date(`${scheduledDate}T${scheduledTime}`),
        address: deliveryType === 'delivery' ? {
          street: address?.street,
          city: address?.city,
          state: address?.state,
          zipCode: address?.zipCode
        } : undefined,
        instructions: specialInstructions
      },
      payment: {
        method: 'stripe',
        status: 'pending',
        amount: totals.total,
        currency: 'usd'
      },
      status: 'pending',
      specialInstructions
    };

    // Handle customer data - either logged in user or guest
    if (req.session.customer) {
      // Logged in customer
      orderData.customer = {
        userId: req.session.customer.id,
        name: req.session.customer.name,
        email: req.session.customer.email,
        phone: req.session.customer.phone || customerPhone,
        isGuest: false,
        address: deliveryType === 'delivery' ? {
          street: address?.street,
          city: address?.city,
          state: address?.state,
          zipCode: address?.zipCode
        } : undefined
      };
    } else {
      // Guest customer
      orderData.customer = {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        isGuest: true,
        address: deliveryType === 'delivery' ? {
          street: address?.street,
          city: address?.city,
          state: address?.state,
          zipCode: address?.zipCode
        } : undefined
      };
    }

    const order = new Order(orderData);

    await order.save();

    // Create Stripe line items
    const lineItems = cart.items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: `Freshly baked ${item.name}`,
          images: item.image ? [`${process.env.BASE_URL}/images/${item.image}`] : []
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Add tax as a separate line item
    if (totals.tax > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Tax',
            description: 'Sales tax (8.5%)'
          },
          unit_amount: Math.round(totals.tax * 100),
        },
        quantity: 1,
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      cancel_url: `${process.env.BASE_URL}/cancel?order_id=${order._id}`,
      customer_email: customerEmail,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber
      },
      billing_address_collection: 'required',
      shipping_address_collection: deliveryType === 'delivery' ? {
        allowed_countries: ['US']
      } : undefined
    });

    // Update order with Stripe session ID
    order.payment.stripeSessionId = session.id;
    await order.save();

    console.log('\n=== Stripe Checkout Session Created ===');
    console.log('Order Number:', order.orderNumber);
    console.log('Session ID:', session.id);
    console.log('Amount:', `$${totals.total}`);
    console.log('=====================================\n');

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      orderId: order._id,
      orderNumber: order.orderNumber
    });

  } catch (error) {
    console.error('Stripe checkout session error:', error);
    
    let errorMessage = 'Error creating checkout session';
    
    // Provide specific error messages for common Stripe issues
    if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Stripe API keys are invalid or expired. Please check your .env file and update with valid Stripe test keys from https://dashboard.stripe.com/test/apikeys';
    } else if (error.code === 'api_key_expired') {
      errorMessage = 'Stripe API key has expired. Please get new test keys from https://dashboard.stripe.com/test/apikeys';
    } else if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid request to Stripe: ' + error.message;
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      stripeError: error.type || 'Unknown'
    });
  }
};

// Handle successful payment
exports.paymentSuccess = async (req, res) => {
  try {
    const { session_id, order_id } = req.query;

    if (!session_id || !order_id) {
      return res.redirect('/cart?error=missing_parameters');
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    // Find the order
    const order = await Order.findById(order_id);
    
    if (!order) {
      return res.redirect('/cart?error=order_not_found');
    }

    // Verify session matches order
    if (order.payment.stripeSessionId !== session_id) {
      return res.redirect('/cart?error=session_mismatch');
    }

    // Clear the cart
    req.session.cart = {
      items: [],
      totalPrice: 0
    };

    console.log('\n=== Payment Success Page ===');
    console.log('Order Number:', order.orderNumber);
    console.log('Session ID:', session_id);
    console.log('Payment Status:', session.payment_status);
    console.log('============================\n');

    res.render('payment-success', {
      title: 'Payment Successful',
      order,
      session,
      orderNumber: order.orderNumber
    });

  } catch (error) {
    console.error('Payment success error:', error);
    res.redirect('/cart?error=payment_verification_failed');
  }
};

// Handle cancelled payment
exports.paymentCancel = async (req, res) => {
  try {
    const { order_id } = req.query;

    let order = null;
    if (order_id) {
      order = await Order.findById(order_id);
    }

    console.log('\n=== Payment Cancelled ===');
    console.log('Order ID:', order_id);
    console.log('Order Number:', order?.orderNumber || 'N/A');
    console.log('========================\n');

    res.render('payment-cancel', {
      title: 'Payment Cancelled',
      order,
      orderNumber: order?.orderNumber || null
    });

  } catch (error) {
    console.error('Payment cancel error:', error);
    res.redirect('/cart');
  }
};

// Stripe Webhook Handler
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('\n=== Stripe Webhook Received ===');
  console.log('Event Type:', event.type);
  console.log('Event ID:', event.id);

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// Handle checkout session completed
async function handleCheckoutSessionCompleted(session) {
  console.log('Processing checkout.session.completed:', session.id);
  
  const orderId = session.metadata.orderId;
  
  if (!orderId) {
    console.error('No order ID found in session metadata');
    return;
  }

  const order = await Order.findById(orderId);
  
  if (!order) {
    console.error('Order not found:', orderId);
    return;
  }

  // Update order with payment information
  order.payment.status = 'paid';
  order.payment.stripePaymentIntentId = session.payment_intent;
  order.payment.paidAt = new Date();
  order.status = 'confirmed';

  await order.save();

  console.log('Order updated successfully:', order.orderNumber);
}

// Handle payment intent succeeded
async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('Processing payment_intent.succeeded:', paymentIntent.id);
  
  // Find order by payment intent ID
  const order = await Order.findOne({
    'payment.stripePaymentIntentId': paymentIntent.id
  });

  if (order && order.payment.status !== 'paid') {
    order.payment.status = 'paid';
    order.payment.paidAt = new Date();
    order.status = 'confirmed';
    
    await order.save();
    console.log('Payment confirmed for order:', order.orderNumber);
  }
}

// Handle payment intent failed
async function handlePaymentIntentFailed(paymentIntent) {
  console.log('Processing payment_intent.payment_failed:', paymentIntent.id);
  
  // Find order by payment intent ID
  const order = await Order.findOne({
    'payment.stripePaymentIntentId': paymentIntent.id
  });

  if (order) {
    order.payment.status = 'failed';
    order.status = 'cancelled';
    
    await order.save();
    console.log('Payment failed for order:', order.orderNumber);
  }
}

module.exports = exports;