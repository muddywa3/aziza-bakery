const { body, validationResult } = require('express-validator');

// Validation rules for product
const productValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 500 }).withMessage('Description must be between 10 and 500 characters'),
  
  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['cakes', 'pastries', 'breads', 'cookies', 'special']).withMessage('Invalid category')
];

// Validation rules for login
const loginValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
];

// Validation rules for order
const orderValidation = [
  body('customerName')
    .trim()
    .notEmpty().withMessage('Customer name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[\d\s\-\+\(\)]+$/).withMessage('Please provide a valid phone number'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address'),
  
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 1, max: 50 }).withMessage('Quantity must be between 1 and 50'),
  
  body('scheduledDate')
    .notEmpty().withMessage('Scheduled date is required')
    .isISO8601().withMessage('Please provide a valid date')
    .custom((value) => {
      const scheduledDate = new Date(value);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      if (scheduledDate < tomorrow) {
        throw new Error('Scheduled date must be at least tomorrow');
      }
      return true;
    }),
  
  body('customMessage')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Custom message cannot exceed 500 characters')
];

// Middleware to check validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    
    // Safe check for JSON requests
    const acceptsJson = req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1);
    
    if (acceptsJson) {
      return res.status(400).json({
        success: false,
        errors: errorMessages
      });
    }
    
    // Store error in session and redirect back
    req.session.validationErrors = errorMessages;
    return res.redirect('back');
  }
  
  next();
};

module.exports = {
  productValidation,
  loginValidation,
  orderValidation,
  handleValidationErrors
};
