// routes/tradingview.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { authenticate } = require('../middleware/auth');

// Add or update TradingView ID
router.post('/add-tradingview', authenticate, async (req, res, next) => {
  try {
    const { tradingViewId } = req.body;

    // Validation
    if (!tradingViewId || tradingViewId.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'TradingView ID is required' 
      });
    }

    // Additional validation for format (matching frontend)
    const trimmedId = tradingViewId.trim();
    if (trimmedId.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'TradingView ID must be at least 3 characters long'
      });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedId)) {
      return res.status(400).json({
        success: false,
        message: 'TradingView ID can only contain letters, numbers, and underscores'
      });
    }

    // Check if TradingView ID already exists for another user (optional - if you want unique IDs)
    const existingUser = await User.findOne({ 
      tradingViewId: trimmedId,
      _id: { $ne: req.user._id }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'This TradingView ID is already registered by another user'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { tradingViewId: trimmedId },
      { new: true, runValidators: true }
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
    const user = await User.findById(req.user._id).select('tradingViewId');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({ 
      success: true, 
      tradingViewId: user.tradingViewId || null 
    });
  } catch (err) {
    next(err);
  }
});

// Delete TradingView ID (optional - good to have)
router.delete('/remove-tradingview', authenticate, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $unset: { tradingViewId: 1 } },
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
      message: 'TradingView ID removed successfully'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;