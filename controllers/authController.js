const User = require('../models/User');

// Show login page
exports.showLogin = (req, res) => {
  res.render('admin/login', {
    error: null,
    title: 'Admin Login'
  });
};

// Handle login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check database user
    const user = await User.findOne({ username, isActive: true });
    
    if (!user) {
      return res.render('admin/login', {
        error: 'Invalid username or password',
        title: 'Admin Login'
      });
    }
    
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.render('admin/login', {
        error: 'Invalid username or password',
        title: 'Admin Login'
      });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Set session
    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.userRole = user.role;
    
    console.log('\n=== Admin Login ===');
    console.log('Username:', user.username);
    console.log('Role:', user.role);
    console.log('Timestamp:', new Date().toLocaleString());
    console.log('==================\n');
    
    const returnTo = req.session.returnTo || '/admin/dashboard';
    delete req.session.returnTo;
    res.redirect(returnTo);
    
  } catch (error) {
    console.error('Login error:', error);
    res.render('admin/login', {
      error: 'An error occurred. Please try again.',
      title: 'Admin Login'
    });
  }
};

// Handle logout
exports.logout = (req, res) => {
  const username = req.session.username;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
    }
    
    console.log('\n=== Admin Logout ===');
    console.log('Username:', username);
    console.log('Timestamp:', new Date().toLocaleString());
    console.log('====================\n');
    
    res.redirect('/admin/login');
  });
};
