// src/routes/tradingview.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { verifyToken } = require('../middleware/auth');

// Add or update TradingView ID
router.post('/add-tradingview', verifyToken, async (req, res, next) => {
  try {
    const { tradingviewId } = req.body;

    if (!tradingviewId || tradingviewId.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'TradingView ID is required' 
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { tradingviewId: tradingviewId.trim() },
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
router.get('/get-tradingview', verifyToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    
    res.json({ 
      success: true, 
      tradingviewId: user?.tradingviewId || null 
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;