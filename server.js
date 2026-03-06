const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');
const sessionMiddleware = require('./config/session');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const publicRoutes = require('./routes/public-simple');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
console.log('Attempting to connect to database...');
connectDB().catch(err => {
  console.log('⚠️  Database connection failed, continuing without database');
  console.log('⚠️  Some features may not work properly');
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for CDN resources
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.'
});

app.use('/admin/login', loginLimiter);
app.use(limiter); // Apply general rate limiter

// Stripe webhook route (MUST be before body parser middleware)
const stripeController = require('./controllers/stripeController');
app.post('/webhook', express.raw({ type: 'application/json' }), stripeController.handleWebhook);

// Body parser middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session middleware
app.use(sessionMiddleware);

// Customer authentication middleware
const { injectCustomerData } = require('./middleware/customerAuth');
const { blockNonAdminFromAdminRoutes } = require('./middleware/auth');
app.use(injectCustomerData);
app.use(blockNonAdminFromAdminRoutes);

// Make session data available to all views
app.use((req, res, next) => {
  res.locals.session = req.session || {};
  next();
});

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.originalUrl} - ${new Date().toLocaleTimeString()}`);
  console.log('Request received:', req.method, req.originalUrl);
  next();
});

// Simple test route
app.get('/debug', (req, res) => {
  res.json({ message: 'Debug route works!', timestamp: new Date().toISOString() });
});

// Routes
console.log('Loading routes...');

app.use('/', publicRoutes);
console.log('Public routes loaded');
app.use('/admin', adminRoutes);
console.log('Admin routes loaded');

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('\n🍰 ================================');
  console.log('   AZIZA BAKERY - ADMIN SYSTEM');
  console.log('   ================================');
  console.log(`   🌐 Server: http://localhost:${PORT}`);
  console.log(`   🔐 Admin: http://localhost:${PORT}/admin`);
  console.log('   ================================\n');
});

module.exports = app;
