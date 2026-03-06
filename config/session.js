const session = require('express-session');

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'aziza-bakery-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS in production
    sameSite: 'strict'
  },
  name: 'aziza.sid' // Custom session name
};

module.exports = session(sessionConfig);
