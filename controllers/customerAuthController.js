const Customer = require('../models/Customer');
const bcrypt = require('bcryptjs');

// Show registration page
exports.showRegister = (req, res) => {
  // Redirect if already logged in
  if (req.session.customer) {
    return res.redirect('/');
  }
  
  res.render('auth/register', {
    title: 'Create Account',
    error: null,
    formData: {}
  });
};

// Handle registration
exports.register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, phone, newsletter } = req.body;
    
    // Validation
    const errors = [];
    
    if (!name || name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      errors.push('Please provide a valid email address');
    }
    
    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    
    if (password !== confirmPassword) {
      errors.push('Passwords do not match');
    }
    
    if (errors.length > 0) {
      return res.render('auth/register', {
        title: 'Create Account',
        error: errors.join('. '),
        formData: { name, email, phone, newsletter }
      });
    }
    
    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ email: email.toLowerCase() });
    if (existingCustomer) {
      return res.render('auth/register', {
        title: 'Create Account',
        error: 'An account with this email already exists',
        formData: { name, email, phone, newsletter }
      });
    }
    
    // Create new customer
    const customer = new Customer({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone?.trim(),
      preferences: {
        newsletter: newsletter === 'on',
        smsNotifications: false
      }
    });
    
    await customer.save();
    
    // Log the customer in
    req.session.customer = {
      id: customer._id,
      name: customer.name,
      email: customer.email,
      role: 'customer'
    };
    
    console.log('✅ New customer registered:', customer.email);
    
    // Redirect to intended page or home
    const redirectTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(redirectTo);
    
  } catch (error) {
    console.error('Registration error:', error);
    res.render('auth/register', {
      title: 'Create Account',
      error: 'Registration failed. Please try again.',
      formData: req.body
    });
  }
};

// Show login page
exports.showLogin = (req, res) => {
  console.log('🔍 showLogin called');
  
  // Redirect if already logged in
  if (req.session.customer) {
    console.log('🔍 Customer already logged in, redirecting');
    return res.redirect('/');
  }
  
  console.log('🔍 Rendering login page');
  
  res.render('auth/login-simple', {
    title: 'Login',
    error: null,
    email: '',
    customer: req.session.customer || null
  });
  
  console.log('🔍 Login page render called');
};

// Handle login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Please provide both email and password',
        email
      });
    }
    
    // Find customer
    const customer = await Customer.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true 
    });
    
    if (!customer) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid email or password',
        email
      });
    }
    
    // Check password
    const isValidPassword = await customer.comparePassword(password);
    if (!isValidPassword) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid email or password',
        email
      });
    }
    
    // Update last login
    await customer.updateLastLogin();
    
    // Create session
    req.session.customer = {
      id: customer._id,
      name: customer.name,
      email: customer.email,
      role: 'customer'
    };
    
    console.log('✅ Customer logged in:', customer.email);
    
    // Redirect to intended page or home
    const redirectTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(redirectTo);
    
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', {
      title: 'Login',
      error: 'Login failed. Please try again.',
      email: req.body.email
    });
  }
};

// Handle logout
exports.logout = (req, res) => {
  const customerEmail = req.session.customer?.email;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/');
    }
    
    console.log('✅ Customer logged out:', customerEmail);
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
};

// Get customer profile
exports.getProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.session.customer.id);
    
    if (!customer) {
      return res.redirect('/login');
    }
    
    res.render('auth/profile', {
      title: 'My Profile',
      customer
    });
    
  } catch (error) {
    console.error('Profile error:', error);
    res.redirect('/');
  }
};

// Update customer profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, newsletter, smsNotifications } = req.body;
    
    const customer = await Customer.findById(req.session.customer.id);
    if (!customer) {
      return res.redirect('/login');
    }
    
    // Update fields
    customer.name = name?.trim() || customer.name;
    customer.phone = phone?.trim() || customer.phone;
    customer.preferences.newsletter = newsletter === 'on';
    customer.preferences.smsNotifications = smsNotifications === 'on';
    
    await customer.save();
    
    // Update session
    req.session.customer.name = customer.name;
    
    console.log('✅ Customer profile updated:', customer.email);
    
    res.redirect('/profile?success=Profile updated successfully');
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.redirect('/profile?error=Failed to update profile');
  }
};

module.exports = exports;