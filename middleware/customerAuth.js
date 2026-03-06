// Customer authentication middleware

// Check if customer is logged in
const requireCustomerAuth = (req, res, next) => {
  if (req.session && req.session.customer) {
    return next();
  }
  
  // Store the intended destination
  req.session.returnTo = req.originalUrl;
  
  // Check if it's an AJAX request
  if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
    return res.status(401).json({ 
      success: false, 
      message: 'Please log in to continue',
      redirectTo: '/login'
    });
  }
  
  res.redirect('/login');
};

// Redirect if already logged in (for login/register pages)
const redirectIfCustomerAuthenticated = (req, res, next) => {
  if (req.session && req.session.customer) {
    const returnTo = req.query.returnTo || '/';
    return res.redirect(returnTo);
  }
  next();
};

// Make customer data available to all views
const injectCustomerData = (req, res, next) => {
  res.locals.customer = req.session.customer || null;
  next();
};

// Optional authentication - doesn't redirect, just sets customer data
const optionalCustomerAuth = (req, res, next) => {
  res.locals.customer = req.session.customer || null;
  next();
};

module.exports = {
  requireCustomerAuth,
  redirectIfCustomerAuthenticated,
  injectCustomerData,
  optionalCustomerAuth
};