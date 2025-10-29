const jwt = require('jsonwebtoken');
const User = require('../models/user');

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

// Check if user is authenticated (for API routes)
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

// Check if user is authenticated (for HTML pages)
const requireLogin = async (req, res, next) => {
  try {
    // Get token from cookies
    const token = req.cookies?.token;
    
    if (!token) {
      // Save the original URL they tried to access
      const returnUrl = encodeURIComponent(req.originalUrl);
      return res.redirect(`/login?returnTo=${returnUrl}`);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    } catch (err) {
      res.clearCookie('token');
      return res.redirect('/login?message=session_expired');
    }

    // Find user in database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      res.clearCookie('token');
      return res.redirect('/login?message=user_not_found');
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    console.error('RequireLogin error:', error.message);
    res.clearCookie('token');
    res.redirect('/login?message=error');
  }
};

// Check if user has active subscription
const requireSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Please login first' 
      });
    }

    // Check subscription status
    if (!req.user.subscriptionStatus || req.user.subscriptionStatus !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: 'Active subscription required. Please subscribe to access this feature.' 
      });
    }

    // Check subscription expiry
    if (req.user.subscriptionEndDate && new Date(req.user.subscriptionEndDate) < new Date()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your subscription has expired. Please renew to continue.' 
      });
    }

    next();
  } catch (err) {
    console.error('Subscription check error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error checking subscription status' 
    });
  }
};

module.exports = {
  generateToken,
  setTokenCookie,
  authenticate,
  requireLogin,
  requireSubscription
};