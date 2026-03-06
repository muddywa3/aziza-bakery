// 404 Error Handler
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Global Error Handler
const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Log error for debugging
  console.error('❌ Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method
  });
  
  // Send appropriate response
  const acceptsJson = req.headers.accept && req.headers.accept.indexOf('json') > -1;
  if (req.xhr || acceptsJson) {
    res.status(statusCode).json({
      success: false,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } else {
    res.status(statusCode).render('error', {
      message: err.message || 'Something went wrong',
      error: {
        status: statusCode,
        stack: process.env.NODE_ENV === 'development' ? err.stack : ''
      }
    });
  }
};

module.exports = {
  notFound,
  errorHandler
};
