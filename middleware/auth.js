// middleware/auth.js
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
  try {
    // Get token from cookies or Authorization header
    let token = req.cookies?.token;
    
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

    // Check if token is blacklisted
    const blacklisted = await BlacklistedToken.findOne({ token });
    if (blacklisted) {
      res.clearCookie('token');
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked.'
      });
    }

    // Verify token
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

    // Find user in database
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.clearCookie('token');
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    // Attach user and userId to request object
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.clearCookie('token');
    res.status(401).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};

// Logout - add token to blacklist
const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    
    if (token) {
      // Add token to blacklist
      await BlacklistedToken.create({ 
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    }
    
    res.clearCookie('token');
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (err) {
    next(err);
  }
};

// Verify token exists (optional middleware)
const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

module.exports = {
  generateToken,
  setTokenCookie,
  authenticate,
  logout,
  verifyToken
};