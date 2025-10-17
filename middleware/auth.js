const jwt = require('jsonwebtoken');
const User = require('../models/user');
const BlacklistedToken = require('../models/blacklistedToken');


// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: '7d'
  });
};

// Set token as HTTP-only cookie
const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

// Check if user is authenticated
const authenticate = async (req, res, next) => {
  // Log incoming token
  let debugToken;
  if (req.cookies && req.cookies.token) {
    debugToken = req.cookies.token;
  } else if (req.headers.cookie) {
    debugToken = require('cookie').parse(req.headers.cookie).token;
  } else {
    debugToken = null;
  }
  console.log('AUTH CHECK: Incoming token:', debugToken);
  try {
    // Check cookie first, then Authorization header
    let token = req.cookies.token;
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      res.clearCookie('token');
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

      // Check persistent blacklist
      const blacklisted = await BlacklistedToken.findOne({ token });
      if (blacklisted) {
        res.clearCookie('token');
        return res.status(401).json({
          success: false,
          message: 'Token has been revoked.'
        });
      }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    } catch (err) {
      res.clearCookie('token');
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.'
      });
    }

    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      res.clearCookie('token');
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.clearCookie('token');
    res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

module.exports = {
  generateToken,
  setTokenCookie,
  authenticate
};
