# Stripe Payment Integration - Production Deployment Guide

## 🚀 Overview

This guide covers the complete Stripe payment integration for Aziza Bakery, including setup, testing, and production deployment.

## 📋 Features Implemented

✅ **Stripe Checkout Integration**
- Secure hosted payment pages
- Automatic tax calculation (8.5%)
- Support for delivery and pickup orders
- Customer billing address collection

✅ **Order Management**
- Orders created before payment (Pending Payment status)
- Automatic status updates via webhooks
- Stripe session and payment intent tracking

✅ **Webhook Security**
- Signature verification
- Raw body parsing for webhooks
- Proper error handling

✅ **Admin Panel Integration**
- Payment status badges (Paid/Pending/Failed)
- Stripe transaction IDs
- Payment method tracking

✅ **User Experience**
- Success and cancel pages
- Cart preservation during checkout
- Loading states and error handling

## 🔧 Environment Setup

### Required Environment Variables

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Test key for development
STRIPE_PUBLISHABLE_KEY=pk_test_... # Test key for development  
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook endpoint secret

# Application URLs
BASE_URL=http://localhost:3000 # Change to production URL

# Database
MONGO_URI=mongodb://localhost:27017/aziza-bakery

# Session Security
SESSION_SECRET=your-super-secure-session-secret-change-in-production
```

## 🧪 Testing Setup

### 1. Get Stripe Test Keys

1. Create a Stripe account at https://stripe.com
2. Go to Dashboard → Developers → API Keys
3. Copy your **Test** keys (they start with `sk_test_` and `pk_test_`)
4. Add them to your `.env` file

### 2. Test Credit Cards

Use these test card numbers in Stripe Checkout:

```
✅ Successful Payment:
4242 4242 4242 4242

❌ Declined Payment:
4000 0000 0000 0002

⏳ Requires Authentication:
4000 0025 0000 3155

💳 Any future expiry date (e.g., 12/34)
🔒 Any 3-digit CVC (e.g., 123)
```

### 3. Webhook Testing (Local Development)

Install Stripe CLI:
```bash
# Install Stripe CLI
# Windows: Download from https://github.com/stripe/stripe-cli/releases
# Mac: brew install stripe/stripe-cli/stripe
# Linux: See Stripe CLI documentation

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/webhook
```

The CLI will show your webhook secret - add it to `.env` as `STRIPE_WEBHOOK_SECRET`.

## 🔄 Webhook Events Handled

The system handles these Stripe webhook events:

- `checkout.session.completed` - Payment session completed
- `payment_intent.succeeded` - Payment successful
- `payment_intent.payment_failed` - Payment failed

## 🚀 Production Deployment

### 1. Switch to Live Keys

1. In Stripe Dashboard, toggle to **Live mode**
2. Get your live API keys (start with `sk_live_` and `pk_live_`)
3. Update environment variables:

```bash
# Production Environment Variables
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
BASE_URL=https://yourdomain.com
NODE_ENV=production
```

### 2. Configure Production Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `https://yourdomain.com/webhook`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the webhook secret and add to production environment

### 3. SSL Certificate

Ensure your production server has a valid SSL certificate. Stripe requires HTTPS for:
- Webhook endpoints
- Success/cancel URLs
- Product images in checkout

### 4. Security Checklist

✅ **Environment Variables**
- All Stripe keys stored in environment variables
- No hardcoded secrets in code
- Strong session secret (32+ characters)

✅ **Webhook Security**
- Webhook signature verification enabled
- Raw body parsing for webhook endpoint
- Proper error handling and logging

✅ **HTTPS**
- SSL certificate installed
- All Stripe URLs use HTTPS
- Secure cookie settings in production

✅ **Database**
- MongoDB connection secured
- Proper indexing on order fields
- Regular backups configured

## 📊 Monitoring & Logging

### Stripe Dashboard

Monitor payments in Stripe Dashboard:
- Payments → View all transactions
- Webhooks → Check delivery status
- Logs → Debug webhook issues

### Application Logs

The system logs important events:
```javascript
// Order creation
console.log('=== Stripe Checkout Session Created ===');

// Webhook processing  
console.log('=== Stripe Webhook Received ===');

// Payment status updates
console.log('Payment confirmed for order:', order.orderNumber);
```

## 🐛 Troubleshooting

### Common Issues

**1. Webhook Not Receiving Events**
- Check webhook URL is correct and accessible
- Verify webhook secret matches
- Check Stripe Dashboard → Webhooks for delivery attempts

**2. Payment Success but Order Not Updated**
- Check webhook endpoint logs
- Verify order ID in session metadata
- Check database connection

**3. Checkout Session Creation Fails**
- Verify Stripe secret key is correct
- Check cart has items
- Ensure all required customer fields provided

**4. SSL/HTTPS Issues**
- Stripe requires HTTPS in production
- Check certificate validity
- Verify all URLs use HTTPS protocol

### Debug Commands

```bash
# Test webhook endpoint
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'

# Check Stripe CLI webhook forwarding
stripe listen --forward-to localhost:3000/webhook --print-json

# Test order creation
curl -X POST http://localhost:3000/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Test","customerEmail":"test@example.com",...}'
```

## 💰 Pricing & Fees

### Stripe Fees (as of 2024)
- **Online payments**: 2.9% + 30¢ per successful charge
- **International cards**: +1.5%
- **Disputes**: $15 per dispute

### Tax Handling
- Currently set to 8.5% sales tax
- Modify in `stripeController.js` line 25:
```javascript
const tax = subtotal * 0.085; // Change rate here
```

## 🔐 Security Best Practices

1. **Never expose secret keys** - Always use environment variables
2. **Verify webhook signatures** - Prevents malicious webhook calls
3. **Use HTTPS everywhere** - Required by Stripe in production
4. **Validate on server** - Never trust client-side payment confirmations
5. **Log security events** - Monitor for suspicious activity
6. **Regular key rotation** - Rotate API keys periodically

## 📞 Support

### Stripe Support
- Documentation: https://stripe.com/docs
- Support: https://support.stripe.com
- Status: https://status.stripe.com

### Application Support
- Check application logs for errors
- Monitor webhook delivery in Stripe Dashboard
- Verify environment variables are set correctly

## 🎯 Next Steps

### Recommended Enhancements

1. **Email Notifications**
   - Send order confirmations via email
   - Payment receipt emails
   - Order status updates

2. **Refund Handling**
   - Admin panel refund functionality
   - Partial refund support
   - Refund webhook handling

3. **Subscription Support**
   - Recurring orders
   - Subscription management
   - Billing portal integration

4. **Advanced Features**
   - Multi-currency support
   - Payment method storage
   - Express checkout (Apple Pay, Google Pay)

---

## 🚨 Important Notes

- **Test thoroughly** before going live
- **Monitor webhook delivery** in production
- **Keep Stripe keys secure** and rotate regularly
- **Backup your database** before major updates
- **Have a rollback plan** for production deployments

This integration provides a secure, production-ready payment system for Aziza Bakery with proper error handling, webhook security, and admin panel integration.