// routes/tradingview.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');

// Middleware to verify user is logged in
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Add or update TradingView ID
router.post('/add-tradingview', authMiddleware, async (req, res, next) => {
  try {
    console.log('📨 Request body:', req.body);
    
    const { tradingViewId } = req.body;

    console.log('📨 Received tradingViewId:', tradingViewId);

    if (!tradingViewId || tradingViewId.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'TradingView ID is required' 
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { tradingViewId: tradingViewId.trim() },
      { new: true }
    );

    res.json({ 
      success: true, 
      message: 'TradingView ID saved successfully',
      user: user.toJSON()
    });
  } catch (err) {
    next(err);
  }
});

// Get user's TradingView ID
router.get('/get-tradingview', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    
    res.json({ 
      success: true, 
      tradingViewId: user?.tradingViewId || null 
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;