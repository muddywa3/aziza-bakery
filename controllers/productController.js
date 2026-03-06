const Product = require('../models/Product');
const fs = require('fs').promises;
const path = require('path');

// List all products
exports.listProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    
    const [products, total] = await Promise.all([
      Product.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments()
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    res.render('admin/products/list', {
      title: 'Manage Products',
      username: req.session.username,
      role: req.session.userRole,
      products,
      currentPage: page,
      totalPages,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).send('Error loading products');
  }
};

// Show create product form
exports.showCreateForm = async (req, res) => {
  try {
    const imagesDir = path.join(__dirname, '../public/images');
    const files = await fs.readdir(imagesDir);
    const images = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    
    res.render('admin/products/create', {
      title: 'Create Product',
      username: req.session.username,
      role: req.session.userRole,
      images,
      product: {},
      errors: []
    });
  } catch (error) {
    console.error('Show create form error:', error);
    res.status(500).send('Error loading form');
  }
};

// Create product
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, category, image, featured } = req.body;
    
    const product = new Product({
      name,
      description,
      price: parseFloat(price),
      category,
      image,
      featured: featured === 'on',
      createdBy: req.session.userId !== 'env_admin' ? req.session.userId : null
    });
    
    await product.save();
    
    console.log('\n=== Product Created ===');
    console.log('Name:', product.name);
    console.log('Price:', product.price);
    console.log('By:', req.session.username);
    console.log('=======================\n');
    
    res.redirect('/admin/products?success=Product created successfully');
  } catch (error) {
    console.error('Create product error:', error);
    res.redirect('/admin/products/create?error=' + encodeURIComponent(error.message));
  }
};

// Show edit product form
exports.showEditForm = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    
    if (!product) {
      return res.redirect('/admin/products?error=Product not found');
    }
    
    const imagesDir = path.join(__dirname, '../public/images');
    const files = await fs.readdir(imagesDir);
    const images = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    
    res.render('admin/products/edit', {
      title: 'Edit Product',
      username: req.session.username,
      role: req.session.userRole,
      product,
      images,
      errors: []
    });
  } catch (error) {
    console.error('Show edit form error:', error);
    res.redirect('/admin/products?error=Error loading product');
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const { name, description, price, category, image, featured, isAvailable } = req.body;
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        price: parseFloat(price),
        category,
        image,
        featured: featured === 'on',
        isAvailable: isAvailable === 'on'
      },
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.redirect('/admin/products?error=Product not found');
    }
    
    console.log('\n=== Product Updated ===');
    console.log('Name:', product.name);
    console.log('By:', req.session.username);
    console.log('=======================\n');
    
    res.redirect('/admin/products?success=Product updated successfully');
  } catch (error) {
    console.error('Update product error:', error);
    res.redirect(`/admin/products/${req.params.id}/edit?error=` + encodeURIComponent(error.message));
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.json({ success: false, message: 'Product not found' });
    }
    
    console.log('\n=== Product Deleted ===');
    console.log('Name:', product.name);
    console.log('By:', req.session.username);
    console.log('=======================\n');
    
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Error deleting product' });
  }
};
