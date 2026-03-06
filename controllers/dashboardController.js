const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const fs = require('fs').promises;
const path = require('path');

// Show dashboard
exports.showDashboard = async (req, res) => {
  try {
    const [productCount, userCount, orderCount, images] = await Promise.all([
      Product.countDocuments(),
      User.countDocuments(),
      Order.countDocuments(),
      fs.readdir(path.join(__dirname, '../public/images'))
    ]);
    
    const recentProducts = await Product.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    const imageCount = images.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file)).length;
    
    res.render('admin/dashboard', {
      title: 'Dashboard',
      username: req.session.username,
      role: req.session.userRole,
      stats: {
        products: productCount,
        users: userCount,
        images: imageCount,
        orders: orderCount
      },
      recentProducts
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', {
      message: 'Error loading dashboard',
      error: { status: 500, stack: '' }
    });
  }
};
