const User = require('../models/User');
const bcrypt = require('bcrypt');

// List all users
exports.listUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      User.find({})
        .select('-password') // Don't send passwords
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({})
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    res.render('admin/users/list', {
      title: 'Manage Users',
      username: req.session.username,
      role: req.session.userRole,
      users,
      currentPage: page,
      totalPages,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).send('Error loading users');
  }
};

// Show create user form
exports.showCreateUser = (req, res) => {
  res.render('admin/users/create', {
    title: 'Create User',
    username: req.session.username,
    role: req.session.userRole,
    error: req.query.error
  });
};

// Create new user
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });
    
    if (existingUser) {
      return res.redirect('/admin/users/create?error=User already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'staff'
    });
    
    await user.save();
    
    console.log('\n=== User Created ===');
    console.log('Username:', user.username);
    console.log('Role:', user.role);
    console.log('By:', req.session.username);
    console.log('===================\n');
    
    res.redirect('/admin/users?success=User created successfully');
  } catch (error) {
    console.error('Create user error:', error);
    res.redirect('/admin/users/create?error=Error creating user');
  }
};

// Show edit user form
exports.showEditUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    
    if (!user) {
      return res.redirect('/admin/users?error=User not found');
    }
    
    res.render('admin/users/edit', {
      title: 'Edit User',
      username: req.session.username,
      role: req.session.userRole,
      user,
      error: req.query.error
    });
  } catch (error) {
    console.error('Show edit user error:', error);
    res.redirect('/admin/users?error=Error loading user');
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { username, email, role, password } = req.body;
    const userId = req.params.id;
    
    // Check if username/email already exists (excluding current user)
    const existingUser = await User.findOne({
      _id: { $ne: userId },
      $or: [{ username }, { email }]
    });
    
    if (existingUser) {
      return res.redirect(`/admin/users/${userId}/edit?error=Username or email already exists`);
    }
    
    const updateData = { username, email, role };
    
    // Only update password if provided
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 12);
    }
    
    await User.findByIdAndUpdate(userId, updateData);
    
    console.log('\n=== User Updated ===');
    console.log('User ID:', userId);
    console.log('By:', req.session.username);
    console.log('===================\n');
    
    res.redirect('/admin/users?success=User updated successfully');
  } catch (error) {
    console.error('Update user error:', error);
    res.redirect(`/admin/users/${req.params.id}/edit?error=Error updating user`);
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Don't allow deleting yourself
    const currentUser = await User.findOne({ username: req.session.username });
    if (currentUser._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }
    
    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('\n=== User Deleted ===');
    console.log('Username:', user.username);
    console.log('By:', req.session.username);
    console.log('===================\n');
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
};

module.exports = exports;