// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  
  // Safe check for JSON requests
  const acceptsJson = req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1);
  
  if (acceptsJson) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
};

// Role-based authorization middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.redirect('/login');
    }
    
    if (!roles.includes(req.session.userRole)) {
      return res.status(403).render('error', {
        message: 'Access Denied',
        error: { status: 403, stack: '' }
      });
    }
    
    next();
  };
};

// Check if user is already logged in
const redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/admin/dashboard');
  }
  next();
};

// Admin-only access middleware
const requireAdmin = (req, res, next) => {
  console.log('🔒 Admin access check:', {
    hasSession: !!req.session,
    hasUserId: !!req.session?.userId,
    isAdmin: !!req.session?.isAdmin,
    userRole: req.session?.userRole
  });
  
  // Check if user is logged in as admin
  if (!req.session || !req.session.userId || !req.session.isAdmin) {
    console.log('❌ Admin access denied - redirecting to home');
    return res.redirect('/');
  }
  
  console.log('✅ Admin access granted');
  next();
};

// Prevent non-admins from accessing admin routes
const blockNonAdminFromAdminRoutes = (req, res, next) => {
  // Check if this is an admin route
  if (req.path.startsWith('/admin')) {
    // If user is logged in as customer, redirect to home
    if (req.session && req.session.customer && !req.session.isAdmin) {
      console.log('❌ Customer tried to access admin route - redirecting to home');
      return res.redirect('/');
    }
    
    // If no session at all, redirect to login
    if (!req.session || (!req.session.userId && !req.session.customer)) {
      console.log('❌ Unauthenticated user tried to access admin route - redirecting to login');
      return res.redirect('/login');
    }
  }
  
  next();
};

module.exports = {
  requireAuth,
  requireRole,
  redirectIfAuthenticated,
  requireAdmin,
  blockNonAdminFromAdminRoutes
};
