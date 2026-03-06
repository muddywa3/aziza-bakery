const Order = require('../models/Order');

// Show tracking form
exports.showTrackingForm = (req, res) => {
  try {
    res.render('tracking/track', {
      title: 'Track Your Order',
      currentPage: 'track',
      error: req.query.error,
      success: req.query.success
    });
  } catch (error) {
    console.error('Show tracking form error:', error);
    res.status(500).render('error', {
      message: 'Error loading tracking page',
      error: { status: 500, stack: '' }
    });
  }
};

// Track order by tracking code
exports.trackOrder = async (req, res) => {
  try {
    const { trackingCode } = req.body;
    
    // Validate input
    if (!trackingCode || typeof trackingCode !== 'string') {
      return res.redirect('/track?error=Please enter a valid tracking code');
    }
    
    // Clean and validate tracking code format
    const cleanTrackingCode = trackingCode.trim().toUpperCase();
    
    if (cleanTrackingCode.length < 6 || !cleanTrackingCode.startsWith('AZ')) {
      return res.redirect('/track?error=Invalid tracking code format');
    }
    
    // Search for order by tracking code
    const order = await Order.findOne({ 
      trackingCode: cleanTrackingCode 
    }).lean();
    
    if (!order) {
      console.log(`🔍 Tracking attempt failed for code: ${cleanTrackingCode}`);
      return res.redirect('/track?error=Order not found. Please check your tracking code and try again.');
    }
    
    console.log(`✅ Order tracked successfully: ${order.orderNumber} (${cleanTrackingCode})`);
    
    // Render tracking result page
    res.render('tracking/result', {
      title: 'Order Tracking Result',
      currentPage: 'track',
      order,
      trackingCode: cleanTrackingCode
    });
    
  } catch (error) {
    console.error('Track order error:', error);
    res.redirect('/track?error=An error occurred while tracking your order. Please try again.');
  }
};

// Get status badge class for UI
exports.getStatusBadgeClass = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'preparing':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'ready':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Get status display text
exports.getStatusDisplayText = (status) => {
  switch (status) {
    case 'pending':
      return 'Order Received';
    case 'confirmed':
      return 'Order Confirmed';
    case 'preparing':
      return 'Being Prepared';
    case 'ready':
      return 'Ready for Pickup';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

// Get status progress percentage
exports.getStatusProgress = (status) => {
  switch (status) {
    case 'pending':
      return 20;
    case 'confirmed':
      return 40;
    case 'preparing':
      return 60;
    case 'ready':
      return 80;
    case 'completed':
      return 100;
    case 'cancelled':
      return 0;
    default:
      return 0;
  }
};

module.exports = exports;