const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Import controllers
const cartController = require('../controllers/cartController');
const stripeController = require('../controllers/stripeController');
const unifiedAuthController = require('../controllers/unifiedAuthController');
const { redirectIfCustomerAuthenticated, requireCustomerAuth } = require('../middleware/customerAuth');

const imagesDir = path.join(__dirname, '../public/images');

// Basic routes
router.get('/', async (req, res) => {
  try {
    const files = await fs.readdir(imagesDir);
    const images = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    res.render('index', { images });
  } catch (error) {
    console.error('Homepage error:', error);
    res.render('index', { images: [] });
  }
});

router.get('/menu', async (req, res) => {
  try {
    const files = await fs.readdir(imagesDir);
    const images = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    const fallbackProducts = images.map((image, index) => ({
      _id: image.replace(/\.(jpg|jpeg|png|gif|webp)$/i, ''),
      name: image.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      price: [4.99, 5.99, 6.99, 7.99, 8.99, 9.99][index % 6],
      description: 'Freshly baked with premium ingredients',
      image: image
    }));
    res.render('menu', { products: fallbackProducts });
  } catch (error) {
    console.error('Menu error:', error);
    res.render('menu', { products: [] });
  }
});

router.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact Us' });
});

router.get('/gallery', async (req, res) => {
  try {
    const files = await fs.readdir(imagesDir);
    const images = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    res.render('gallery', { images });
  } catch (error) {
    console.error('Gallery error:', error);
    res.render('gallery', { images: [] });
  }
});

// ===== CART ROUTES =====
router.get('/cart', cartController.showCart);
router.post('/cart/add/:productId', cartController.addToCart);
router.post('/cart/remove/:productId', cartController.removeFromCart);
router.post('/cart/update/:productId', cartController.updateCartItem);
router.post('/cart/clear', cartController.clearCart);
router.get('/cart/count', cartController.getCartCount);

// ===== CHECKOUT & STRIPE ROUTES =====
router.get('/checkout', (req, res) => {
  try {
    const cart = req.session.cart || { items: [], totalPrice: 0 };
    
    if (cart.items.length === 0) {
      return res.redirect('/cart?error=empty_cart');
    }
    
    // Calculate totals
    const subtotal = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tax = subtotal * 0.085;
    const total = subtotal + tax;
    
    res.render('checkout', {
      title: 'Checkout',
      cart,
      customer: req.session.customer || null,
      totals: {
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        total: Math.round(total * 100) / 100
      }
    });
  } catch (error) {
    console.error('Checkout route error:', error);
    res.redirect('/cart?error=checkout_failed');
  }
});

// Test order creation without Stripe
router.post('/test-order-creation', async (req, res) => {
  try {
    const Order = require('../models/Order');
    
    console.log('🧪 Testing order creation...');
    
    const testOrder = new Order({
      customer: {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '555-123-4567'
      },
      items: [{
        productId: 'test-product',
        name: 'Test Product',
        price: 9.99,
        quantity: 1
      }],
      totals: {
        subtotal: 9.99,
        tax: 0.85,
        total: 10.84
      },
      delivery: {
        type: 'pickup',
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      },
      payment: {
        method: 'stripe',
        status: 'pending',
        amount: 10.84,
        currency: 'usd'
      },
      status: 'pending'
    });
    
    await testOrder.save();
    
    res.json({
      success: true,
      message: 'Test order created successfully',
      orderNumber: testOrder.orderNumber,
      trackingCode: testOrder.trackingCode
    });
    
  } catch (error) {
    console.error('Test order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Test order creation failed',
      error: error.message
    });
  }
});

router.post('/create-checkout-session', stripeController.createCheckoutSession);
router.get('/success', stripeController.paymentSuccess);
router.get('/cancel', stripeController.paymentCancel);

// Order route - working version
router.get('/order', async (req, res) => {
  try {
    console.log('🎯 ORDER ROUTE HIT - Working version');
    
    // Create fallback products from images
    const files = await fs.readdir(imagesDir);
    const images = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    
    const products = images.slice(0, 12).map((image, index) => ({
      _id: image.replace(/\.(jpg|jpeg|png|gif|webp)$/i, ''),
      name: image.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: 'Freshly baked with premium ingredients and lots of love',
      price: [4.99, 5.99, 6.99, 7.99, 8.99, 9.99, 12.99, 14.99, 16.99, 18.99, 22.99, 24.99][index % 12],
      category: ['cakes', 'pastries', 'breads', 'cookies', 'special'][index % 5],
      image: image,
      isAvailable: true,
      featured: index < 3
    }));
    
    const productsByCategory = products.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = [];
      }
      acc[product.category].push(product);
      return acc;
    }, {});
    
    console.log(`✅ Rendering order form with ${Object.keys(productsByCategory).length} categories`);
    
    res.render('order-page', {
      title: 'Place Your Order',
      productsByCategory,
      categories: Object.keys(productsByCategory),
      selectedProduct: null
    });
  } catch (error) {
    console.error('Order route error:', error);
    res.status(500).json({ error: 'Order route failed', message: error.message });
  }
});

// Tracking routes
router.get('/track', (req, res) => {
  try {
    res.render('tracking/track', {
      title: 'Track Your Order'
    });
  } catch (error) {
    console.error('Track route error:', error);
    res.status(500).json({ error: 'Track route failed', message: error.message });
  }
});

// Test route
router.get('/test-cart', (req, res) => {
  res.sendFile(path.join(__dirname, '../test-cart.html'));
});

// Stripe test route
router.get('/test-stripe-keys', (req, res) => {
  res.sendFile(path.join(__dirname, '../test-stripe-keys.html'));
});

// Debug route to manually add item
router.get('/debug-add-cart', async (req, res) => {
  try {
    // Manually add an item to test
    const response = await fetch('http://localhost:3000/cart/add/chocolate-cake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || ''
      },
      body: JSON.stringify({ quantity: 1 })
    });
    
    const result = await response.json();
    res.json({ 
      message: 'Debug add to cart test',
      result: result,
      sessionId: req.sessionID,
      cookies: req.headers.cookie
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Test login route
router.get('/test-login-route', (req, res) => {
  res.json({ 
    message: 'Login route test works!', 
    timestamp: new Date(),
    session: req.session ? 'exists' : 'missing',
    sessionId: req.sessionID
  });
});

// Test session route
router.get('/test-session', (req, res) => {
  if (!req.session.visits) {
    req.session.visits = 0;
  }
  req.session.visits++;
  
  res.json({
    message: 'Session test',
    visits: req.session.visits,
    sessionId: req.sessionID,
    session: req.session
  });
});

router.get('/order-test', (req, res) => {
  res.json({ message: 'Order test route works! CACHE CLEARED 12:27', timestamp: new Date() });
});

router.get('/register-test', (req, res) => {
  res.json({ message: 'Register test route works!', timestamp: new Date() });
});

// ===== CUSTOMER AUTHENTICATION ROUTES =====
router.get('/login', redirectIfCustomerAuthenticated, unifiedAuthController.showLogin);
router.post('/login', redirectIfCustomerAuthenticated, unifiedAuthController.login);
router.get('/register', redirectIfCustomerAuthenticated, unifiedAuthController.showRegister);
router.post('/register', redirectIfCustomerAuthenticated, unifiedAuthController.register);
router.get('/logout', unifiedAuthController.logout);
router.get('/profile', requireCustomerAuth, unifiedAuthController.getProfile);
router.post('/profile', requireCustomerAuth, unifiedAuthController.updateProfile);

// My Orders route for customers
router.get('/my-orders', requireCustomerAuth, async (req, res) => {
  try {
    const Order = require('../models/Order');
    const orders = await Order.find({ 
      $or: [
        { userId: req.session.customer.id },
        { 'customer.email': req.session.customer.email }
      ]
    }).sort({ createdAt: -1 });
    
    res.render('customer/orders', {
      title: 'My Orders',
      orders,
      customer: req.session.customer
    });
  } catch (error) {
    console.error('My Orders error:', error);
    res.redirect('/?error=orders_failed');
  }
});

module.exports = router;