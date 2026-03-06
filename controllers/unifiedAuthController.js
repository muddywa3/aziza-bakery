const Customer = require('../models/Customer');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Show unified login page (for both customers and admins)
exports.showLogin = (req, res) => {
  // Redirect if already logged in
  if (req.session.customer || req.session.userId) {
    const redirectUrl = req.session.customer ? '/' : '/admin/dashboard';
    return res.redirect(redirectUrl);
  }
  
  console.log('🔍 Unified login page requested');
  
  res.render('auth/login-simple', {
    title: 'Login',
    error: null,
    email: '',
    customer: null
  });
};

// Handle unified login (customers and admins)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔍 Login attempt for:', email);
    
    // Validation
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.render('auth/login-simple', {
        title: 'Login',
        error: 'Please provide both email and password',
        email,
        customer: null
      });
    }
    
    // First, try to find as admin user
    const adminUser = await User.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true 
    });
    
    if (adminUser) {
      console.log('🔍 Found admin user:', adminUser.email);
      
      // Check password for admin
      const isValidPassword = await adminUser.comparePassword(password);
      if (isValidPassword) {
        // Update last login using updateOne to avoid pre-save middleware
        await User.updateOne(
          { _id: adminUser._id }, 
          { lastLogin: new Date() }
        );
        
        // Create admin session
        req.session.userId = adminUser._id;
        req.session.username = adminUser.username || adminUser.email;
        req.session.userRole = adminUser.role;
        req.session.isAdmin = true;
        
        console.log('✅ Admin logged in successfully:', adminUser.email);
        
        // Redirect to admin dashboard
        return res.redirect('/admin/dashboard');
      }
    }
    
    // If not admin or wrong admin password, try customer
    const customer = await Customer.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true 
    });
    
    if (customer) {
      console.log('🔍 Found customer:', customer.email);
      
      // Check password for customer
      const isValidPassword = await customer.comparePassword(password);
      if (isValidPassword) {
        // Update last login
        await customer.updateLastLogin();
        
        // Create customer session
        req.session.customer = {
          id: customer._id,
          name: customer.name,
          email: customer.email,
          role: 'customer'
        };
        
        console.log('✅ Customer logged in successfully:', customer.email);
        
        // Redirect to intended page or home
        const redirectTo = req.session.returnTo || '/';
        delete req.session.returnTo;
        return res.redirect(redirectTo);
      }
    }
    
    // If we get here, login failed
    console.log('❌ Login failed for:', email);
    
    return res.render('auth/login-simple', {
      title: 'Login',
      error: 'Invalid email or password',
      email,
      customer: null
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login-simple', {
      title: 'Login',
      error: 'Login failed. Please try again.',
      email: req.body.email || '',
      customer: null
    });
  }
};

// Handle logout (both customers and admins)
exports.logout = (req, res) => {
  const userEmail = req.session.customer?.email || req.session.username;
  const isAdmin = req.session.isAdmin;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/');
    }
    
    console.log('✅ User logged out:', userEmail, isAdmin ? '(Admin)' : '(Customer)');
    res.clearCookie('connect.sid');
    
    // Redirect based on user type
    if (isAdmin) {
      res.redirect('/login');
    } else {
      res.redirect('/');
    }
  });
};

// Show customer registration page (customers only)
exports.showRegister = (req, res) => {
  // Redirect if already logged in
  if (req.session.customer || req.session.userId) {
    return res.redirect('/');
  }
  
  res.render('auth/register', {
    title: 'Create Account',
    error: null,
    formData: {}
  });
};

// Handle customer registration (customers only - admins cannot register)
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
    
    // Check if email already exists (in both Customer and User collections)
    const existingCustomer = await Customer.findOne({ email: email.toLowerCase() });
    const existingAdmin = await User.findOne({ email: email.toLowerCase() });
    
    if (existingCustomer || existingAdmin) {
      return res.render('auth/register', {
        title: 'Create Account',
        error: 'An account with this email already exists',
        formData: { name, email, phone, newsletter }
      });
    }
    
    // Create new customer (role is always 'customer' for registrations)
    const customer = new Customer({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone?.trim(),
      role: 'customer', // Force customer role
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

// Show customer profile (customers only)
exports.getProfile = async (req, res) => {
  try {
    if (!req.session.customer) {
      return res.redirect('/login');
    }
    
    const customer = await Customer.findById(req.session.customer.id);
    if (!customer) {
      return res.redirect('/login');
    }
    
    res.render('auth/profile', {
      title: 'My Profile',
      customer,
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.redirect('/');
  }
};

// Update customer profile (customers only)
exports.updateProfile = async (req, res) => {
  try {
    if (!req.session.customer) {
      return res.redirect('/login');
    }
    
    const { name, email, phone, currentPassword, newPassword, confirmPassword } = req.body;
    const customer = await Customer.findById(req.session.customer.id);
    
    if (!customer) {
      return res.redirect('/login');
    }
    
    // Validation
    const errors = [];
    
    if (!name || name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      errors.push('Please provide a valid email address');
    }
    
    // Check if email is already taken by another user
    if (email.toLowerCase() !== customer.email.toLowerCase()) {
      const existingCustomer = await Customer.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: customer._id }
      });
      const existingAdmin = await User.findOne({ email: email.toLowerCase() });
      
      if (existingCustomer || existingAdmin) {
        errors.push('This email is already in use');
      }
    }
    
    // Password change validation
    if (newPassword) {
      if (!currentPassword) {
        errors.push('Current password is required to change password');
      } else {
        const isCurrentPasswordValid = await customer.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
          errors.push('Current password is incorrect');
        }
      }
      
      if (newPassword.length < 6) {
        errors.push('New password must be at least 6 characters long');
      }
      
      if (newPassword !== confirmPassword) {
        errors.push('New passwords do not match');
      }
    }
    
    if (errors.length > 0) {
      return res.render('auth/profile', {
        title: 'My Profile',
        customer,
        error: errors.join('. '),
        success: null
      });
    }
    
    // Update customer data
    customer.name = name.trim();
    customer.email = email.toLowerCase().trim();
    if (phone) customer.phone = phone.trim();
    
    // Update password if provided
    if (newPassword) {
      customer.password = newPassword;
    }
    
    await customer.save();
    
    // Update session data
    req.session.customer.name = customer.name;
    req.session.customer.email = customer.email;
    
    res.render('auth/profile', {
      title: 'My Profile',
      customer,
      error: null,
      success: 'Profile updated successfully!'
    });
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.render('auth/profile', {
      title: 'My Profile',
      customer: req.session.customer,
      error: 'Profile update failed. Please try again.',
      success: null
    });
  }
};

module.exports = exports;