// routes/tradingview.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { authenticate } = require('../middleware/auth');

// Add or update TradingView ID
router.post('/add-tradingview', authenticate, async (req, res, next) => {
  try {
    const { tradingViewId } = req.body;

    if (!tradingViewId || tradingViewId.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'TradingView ID is required' 
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { tradingViewId: tradingViewId.trim() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

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
router.get('/get-tradingview', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({ 
      success: true, 
      tradingViewId: user?.tradingViewId || null 
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;