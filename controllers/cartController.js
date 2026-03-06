const Product = require('../models/Product');

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

// Calculate total price
const calculateTotal = (cart) => {
  cart.totalPrice = cart.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  return cart.totalPrice;
};

// Display cart page
exports.showCart = (req, res) => {
  try {
    const cart = initializeCart(req);
    calculateTotal(cart);
    
    console.log('🛒 Cart displayed:', {
      sessionId: req.sessionID,
      itemCount: cart.items.length,
      total: cart.totalPrice,
      items: cart.items.map(item => ({ name: item.name, quantity: item.quantity }))
    });
    
    res.render('cart', {
      title: 'Shopping Cart',
      cart,
      isEmpty: cart.items.length === 0
    });
  } catch (error) {
    console.error('Show cart error:', error);
    res.status(500).render('error', {
      message: 'Error loading cart',
      error: { status: 500, stack: '' }
    });
  }
};

// Add product to cart
exports.addToCart = async (req, res) => {
  try {
    const productId = req.params.productId;
    const quantity = parseInt(req.body.quantity) || 1;
    
    // Validate quantity
    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }
    
    const cart = initializeCart(req);
    
    let product = null;
    
    // Try to find product in database first (only if it's a valid ObjectId)
    if (productId.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(productId).lean();
    }
    
    // If not found and it looks like an image name, create from image
    if (!product) {
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
          product = {
            _id: productId,
            name: matchingImage.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            price: 6.99,
            image: matchingImage,
            isAvailable: true
          };
        }
      } catch (imageError) {
        console.error('Error finding image:', imageError);
      }
    }
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if product already exists in cart
    const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (existingItemIndex > -1) {
      // Update quantity
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({
        productId: productId,
        name: product.name,
        price: product.price,
        quantity: quantity,
        image: product.image
      });
    }
    
    calculateTotal(cart);
    
    console.log('🛒 Product added to cart:', {
      sessionId: req.sessionID,
      product: product.name,
      quantity,
      cartTotal: cart.totalPrice,
      itemCount: cart.items.length,
      allItems: cart.items.map(item => ({ name: item.name, quantity: item.quantity }))
    });
    
    res.json({
      success: true,
      message: `${product.name} added to cart`,
      cart: {
        itemCount: cart.items.length,
        totalPrice: cart.totalPrice
      }
    });
    
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding product to cart'
    });
  }
};

// Remove product from cart
exports.removeFromCart = (req, res) => {
  try {
    const productId = req.params.productId;
    const cart = initializeCart(req);
    
    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in cart'
      });
    }
    
    const removedItem = cart.items[itemIndex];
    cart.items.splice(itemIndex, 1);
    calculateTotal(cart);
    
    console.log('🛒 Product removed from cart:', {
      product: removedItem.name,
      cartTotal: cart.totalPrice,
      itemCount: cart.items.length
    });
    
    res.json({
      success: true,
      message: `${removedItem.name} removed from cart`,
      cart: {
        itemCount: cart.items.length,
        totalPrice: cart.totalPrice
      }
    });
    
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing product from cart'
    });
  }
};

// Update product quantity in cart
exports.updateCartItem = (req, res) => {
  try {
    const productId = req.params.productId;
    const quantity = parseInt(req.body.quantity);
    
    // Validate quantity
    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }
    
    const cart = initializeCart(req);
    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in cart'
      });
    }
    
    cart.items[itemIndex].quantity = quantity;
    calculateTotal(cart);
    
    console.log('🛒 Cart item updated:', {
      product: cart.items[itemIndex].name,
      newQuantity: quantity,
      cartTotal: cart.totalPrice
    });
    
    res.json({
      success: true,
      message: 'Cart updated',
      cart: {
        itemCount: cart.items.length,
        totalPrice: cart.totalPrice
      }
    });
    
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating cart'
    });
  }
};

// Clear entire cart
exports.clearCart = (req, res) => {
  try {
    req.session.cart = {
      items: [],
      totalPrice: 0
    };
    
    console.log('🛒 Cart cleared');
    
    res.json({
      success: true,
      message: 'Cart cleared',
      cart: {
        itemCount: 0,
        totalPrice: 0
      }
    });
    
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cart'
    });
  }
};

// Get cart count for navigation
exports.getCartCount = (req, res) => {
  try {
    const cart = initializeCart(req);
    const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
    
    console.log('🛒 Cart count requested:', {
      sessionId: req.sessionID,
      itemCount,
      totalPrice: cart.totalPrice,
      items: cart.items.map(item => ({ name: item.name, quantity: item.quantity }))
    });
    
    res.json({
      success: true,
      itemCount,
      totalPrice: cart.totalPrice
    });
    
  } catch (error) {
    console.error('Get cart count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting cart count'
    });
  }
};

module.exports = exports;