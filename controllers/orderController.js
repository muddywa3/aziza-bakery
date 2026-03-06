const Order = require('../models/Order');
let Product;

// Safely import Product model
try {
  Product = require('../models/Product');
} catch (error) {
  console.log('⚠️  Product model not available');
}

// Initialize cart in session if it doesn't exist
const initializeCart = (req) => {
  if (!req.session.cart) {
    req.session.cart = {
      items: [],
      totalPrice: 0
    };
  }
  return req.session.cart;
};

// Show order form (general)
exports.showOrderForm = async (req, res) => {
  try {
    console.log('🎯 ORDER FORM ROUTE HIT - General Order');
    
    let products = [];
    
    // Try to get products from database if connected
    try {
      if (Product) {
        products = await Product.find({ isAvailable: true })
          .sort({ category: 1, name: 1 })
          .lean();
      }
    } catch (dbError) {
      console.log('⚠️  Database not available, using fallback products');
    }
    
    // If no products (either DB not connected or empty), create fallback products from images
    if (products.length === 0) {
      const fs = require('fs').promises;
      const path = require('path');
      const imagesDir = path.join(__dirname, '../public/images');
      
      try {
        const files = await fs.readdir(imagesDir);
        const images = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
        
        products = images.slice(0, 12).map((image, index) => ({
          _id: image.replace(/\.(jpg|jpeg|png|gif|webp)$/i, ''),
          name: image.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: 'Freshly baked with premium ingredients and lots of love',
          price: [4.99, 5.99, 6.99, 7.99, 8.99, 9.99, 12.99, 14.99, 16.99, 18.99, 22.99, 24.99][index % 12],
          category: ['cakes', 'pastries', 'breads', 'cookies', 'special'][index % 5],
          image: image,
          isAvailable: true,
          featured: index < 3
        }));
        
        console.log(`✅ Using ${products.length} fallback products for ordering`);
      } catch (imageError) {
        console.error('Error reading images:', imageError);
        // Create minimal fallback products
        products = [
          {
            _id: 'chocolate-cake',
            name: 'Chocolate Cake',
            description: 'Rich chocolate cake with premium cocoa',
            price: 24.99,
            category: 'cakes',
            image: 'chocolate-cake.jpeg',
            isAvailable: true,
            featured: true
          }
        ];
      }
    }
    
    const productsByCategory = products.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = [];
      }
      acc[product.category].push(product);
      return acc;
    }, {});
    
    console.log(`✅ Rendering order form with ${Object.keys(productsByCategory).length} categories`);
    console.log(`📦 Products by category:`, Object.keys(productsByCategory));
    
    res.render('order-page', {
      title: 'Place Your Order',
      productsByCategory,
      categories: Object.keys(productsByCategory),
      selectedProduct: null
    });
  } catch (error) {
    console.error('Show order form error:', error);
    res.status(500).render('error', {
      message: 'Error loading order form',
      error: { status: 500, stack: '' }
    });
  }
};

// Show order form for specific product
exports.showOrderFormForProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    console.log(`🎯 ORDER FORM ROUTE HIT - Product ID: ${productId}`);
    
    let selectedProduct = null;
    
    // Try database first if connected
    try {
      if (Product && productId.match(/^[0-9a-fA-F]{24}$/)) {
        selectedProduct = await Product.findById(productId).lean();
      }
    } catch (dbError) {
      console.log('⚠️  Database not available for product lookup');
    }
    
    // If not found and it looks like an image name, create from image
    if (!selectedProduct) {
      const fs = require('fs').promises;
      const path = require('path');
      const imagesDir = path.join(__dirname, '../public/images');
      
      try {
        const files = await fs.readdir(imagesDir);
        const matchingImage = files.find(file => 
          file.toLowerCase().includes(productId.toLowerCase()) ||
          productId.toLowerCase().includes(file.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').toLowerCase())
        );
        
        if (matchingImage) {
          selectedProduct = {
            _id: productId,
            name: matchingImage.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: 'Freshly baked with premium ingredients and lots of love',
            price: 6.99,
            category: 'special',
            image: matchingImage,
            isAvailable: true
          };
        }
      } catch (imageError) {
        console.error('Error finding image:', imageError);
      }
    }
    
    if (!selectedProduct) {
      return res.status(404).render('error', {
        message: 'Product not found',
        error: { status: 404, stack: '' }
      });
    }
    
    // Get all products for the full order form
    let products = [];
    
    try {
      if (Product) {
        products = await Product.find({ isAvailable: true })
          .sort({ category: 1, name: 1 })
          .lean();
      }
    } catch (dbError) {
      console.log('⚠️  Database not available, using fallback products');
    }
    
    // If no products in database, create some sample products from images
    if (products.length === 0) {
      const fs = require('fs').promises;
      const path = require('path');
      const imagesDir = path.join(__dirname, '../public/images');
      
      try {
        const files = await fs.readdir(imagesDir);
        const images = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
        
        const sampleProducts = images.slice(0, 12).map((image, index) => ({
          name: image.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: 'Freshly baked with premium ingredients and lots of love',
          price: [4.99, 5.99, 6.99, 7.99, 8.99, 9.99, 12.99, 14.99, 16.99, 18.99, 22.99, 24.99][index % 12],
          category: ['cakes', 'pastries', 'breads', 'cookies', 'special'][index % 5],
          image: image,
          isAvailable: true,
          featured: index < 3
        }));
        
        // Create products in database
        await Product.insertMany(sampleProducts);
        console.log(`✅ Created ${sampleProducts.length} sample products for ordering`);
        
        // Fetch the newly created products
        products = await Product.find({ isAvailable: true })
          .sort({ category: 1, name: 1 })
          .lean();
      } catch (imageError) {
        console.error('Error creating sample products:', imageError);
      }
    }
    
    const productsByCategory = products.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = [];
      }
      acc[product.category].push(product);
      return acc;
    }, {});
    
    console.log(`✅ Rendering order form with selected product: ${selectedProduct.name}`);
    
    res.render('order-page', {
      title: `Order ${selectedProduct.name}`,
      productsByCategory,
      categories: Object.keys(productsByCategory),
      selectedProduct
    });
  } catch (error) {
    console.error('Show order form for product error:', error);
    res.status(500).render('error', {
      message: 'Error loading order form',
      error: { status: 500, stack: '' }
    });
  }
};

// Create order
exports.createOrder = async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      deliveryType,
      scheduledDate,
      scheduledTime,
      address,
      specialInstructions,
      items
    } = req.body;
    
    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items in order'
      });
    }
    
    // Get product details and validate
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.productId} is not available`
        });
      }
      
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: parseInt(item.quantity)
      });
    }
    
    // Create scheduled date
    const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
    
    // Create order
    const order = new Order({
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: deliveryType === 'delivery' ? {
          street: address?.street,
          city: address?.city,
          state: address?.state,
          zipCode: address?.zipCode
        } : undefined
      },
      items: orderItems,
      delivery: {
        type: deliveryType,
        scheduledFor,
        address: deliveryType === 'delivery' ? {
          street: address?.street,
          city: address?.city,
          state: address?.state,
          zipCode: address?.zipCode
        } : undefined,
        instructions: specialInstructions
      },
      specialInstructions
    });
    
    await order.save();
    
    console.log('\n=== Order Created ===');
    console.log('Order Number:', order.orderNumber);
    console.log('Customer:', order.customer.name);
    console.log('Total:', `$${order.totals.total}`);
    console.log('Items:', order.items.length);
    console.log('=====================\n');
    
    res.json({
      success: true,
      message: 'Order placed successfully!',
      orderNumber: order.orderNumber,
      redirectUrl: `/order-confirmation/${order.orderNumber}`
    });
    
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order. Please try again.'
    });
  }
};

// Show order confirmation
exports.showOrderConfirmation = async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .populate('items.product')
      .lean();
    
    if (!order) {
      return res.status(404).render('error', {
        message: 'Order not found',
        error: { status: 404, stack: '' }
      });
    }
    
    res.render('order-confirmation', {
      title: 'Order Confirmation',
      order
    });
  } catch (error) {
    console.error('Show order confirmation error:', error);
    res.status(500).render('error', {
      message: 'Error loading order confirmation',
      error: { status: 500, stack: '' }
    });
  }
};

// Admin: List all orders
exports.listOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const status = req.query.status || 'all';
    
    const filter = status !== 'all' ? { status } : {};
    
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('items.product', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter)
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    res.render('admin/orders/list', {
      title: 'Manage Orders',
      username: req.session.username,
      role: req.session.userRole,
      orders,
      currentPage: page,
      totalPages,
      currentStatus: status,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).send('Error loading orders');
  }
};

// Admin: Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    console.log('\n=== Order Status Updated ===');
    console.log('Order:', order.orderNumber);
    console.log('Status:', status);
    console.log('By:', req.session.username);
    console.log('============================\n');
    
    res.json({
      success: true,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status'
    });
  }
};

// Admin: View order details
exports.viewOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product')
      .lean();
    
    if (!order) {
      return res.redirect('/admin/orders?error=Order not found');
    }
    
    res.render('admin/orders/details', {
      title: `Order ${order.orderNumber}`,
      username: req.session.username,
      role: req.session.userRole,
      order
    });
  } catch (error) {
    console.error('View order details error:', error);
    res.redirect('/admin/orders?error=Error loading order details');
  }
};

// Show checkout page
exports.showCheckout = (req, res) => {
  try {
    const cart = initializeCart(req);
    
    if (cart.items.length === 0) {
      return res.redirect('/cart');
    }
    
    // Calculate totals
    const subtotal = cart.totalPrice;
    const tax = subtotal * 0.085;
    const total = subtotal + tax;
    
    res.render('checkout', {
      title: 'Checkout',
      cart,
      totals: {
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Show checkout error:', error);
    res.status(500).render('error', {
      message: 'Error loading checkout page',
      error: { status: 500, stack: '' }
    });
  }
};

// Process checkout and create order
exports.processCheckout = async (req, res) => {
  try {
    const cart = initializeCart(req);
    
    if (cart.items.length === 0) {
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
    
    // Create scheduled date
    const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
    
    // Calculate totals
    const subtotal = cart.totalPrice;
    const tax = subtotal * 0.085;
    const total = subtotal + tax;
    
    // Create order
    const order = new Order({
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: deliveryType === 'delivery' ? {
          street: address?.street,
          city: address?.city,
          state: address?.state,
          zipCode: address?.zipCode
        } : undefined
      },
      items: cart.items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      })),
      totalPrice: parseFloat(total.toFixed(2)),
      delivery: {
        type: deliveryType || 'pickup',
        scheduledFor,
        address: deliveryType === 'delivery' ? {
          street: address?.street,
          city: address?.city,
          state: address?.state,
          zipCode: address?.zipCode
        } : undefined,
        instructions: specialInstructions
      },
      specialInstructions,
      status: 'pending'
    });
    
    await order.save();
    
    console.log('\n=== Order Created from Cart ===');
    console.log('Order Number:', order.orderNumber);
    console.log('Customer:', order.customer.name);
    console.log('Total:', `$${order.totalPrice}`);
    console.log('Items:', order.items.length);
    console.log('===============================\n');
    
    // Clear cart after successful order
    req.session.cart = {
      items: [],
      totalPrice: 0
    };
    
    res.json({
      success: true,
      message: 'Order placed successfully!',
      orderNumber: order.orderNumber,
      redirectUrl: `/order-confirmation/${order.orderNumber}`
    });
    
  } catch (error) {
    console.error('Process checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing order. Please try again.'
    });
  }
};