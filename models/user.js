// routes/subscription.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');

// Get user's subscription details
router.get('/status', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const hasActiveSubscription = user.hasActiveSubscription();
    const daysRemaining = user.getDaysRemaining();

    // Build response
    const subscriptionData = {
      success: true,
      subscription: {
        isActive: hasActiveSubscription,
        hasActiveSubscription: hasActiveSubscription,
        daysRemaining: daysRemaining
      }
    };

    // Add plan details if active
    if (hasActiveSubscription && user.activePlan) {
      subscriptionData.subscription.planName = user.activePlan.name;
      subscriptionData.subscription.planId = user.activePlan.planId;
      subscriptionData.subscription.price = user.activePlan.price;
      subscriptionData.subscription.startDate = user.activePlan.startDate;
      subscriptionData.subscription.endDate = user.activePlan.endDate;
      subscriptionData.subscription.expiryDate = user.activePlan.endDate; // Alias
    }

    // Add TradingView ID status
    if (user.tradingViewId) {
      subscriptionData.subscription.tradingViewId = user.tradingViewId;
      subscriptionData.subscription.tradingViewStatus = 'connected';
    } else {
      subscriptionData.subscription.tradingViewStatus = 'not_submitted';
    }

    // Payment details (if available from activePlan)
    if (user.activePlan && user.activePlan.price) {
      subscriptionData.subscription.paymentAmount = user.activePlan.price;
      subscriptionData.subscription.paymentDate = user.activePlan.startDate;
    }

    res.json(subscriptionData);

  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription details'
    });
  }
});

// Submit/Update TradingView ID
router.post('/tradingview-id', async (req, res) => {
  try {
    const { tradingViewId } = req.body;

    if (!tradingViewId || !tradingViewId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'TradingView ID is required'
      });
    }

    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has active subscription
    if (!user.hasActiveSubscription()) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required to submit TradingView ID'
      });
    }

    // Update TradingView ID
    user.tradingViewId = tradingViewId.trim();
    await user.save();

    res.json({
      success: true,
      message: 'TradingView ID submitted successfully',
      tradingViewId: user.tradingViewId,
      tradingViewStatus: 'connected'
    });

  } catch (error) {
    console.error('Error submitting TradingView ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit TradingView ID'
    });
  }
});

// Get TradingView ID status
router.get('/tradingview-id', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      tradingViewId: user.tradingViewId || null,
      tradingViewStatus: user.tradingViewId ? 'connected' : 'not_submitted',
      hasActiveSubscription: user.hasActiveSubscription()
    });

  } catch (error) {
    console.error('Error fetching TradingView ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch TradingView ID'
    });
  }
});

// Renew/Extend subscription (for admin or after payment)
router.post('/renew', async (req, res) => {
  try {
    const { planId, planName, price, durationMonths } = req.body;

    if (!planId || !planName || !price || !durationMonths) {
      return res.status(400).json({
        success: false,
        message: 'Plan details are required'
      });
    }

    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + parseInt(durationMonths));

    user.activePlan = {
      planId,
      name: planName,
      price,
      startDate,
      endDate
    };

    user.expiryWarningEmailSent = false; // Reset warning flag
    await user.save();

    res.json({
      success: true,
      message: 'Subscription renewed successfully',
      subscription: {
        planName: user.activePlan.name,
        startDate: user.activePlan.startDate,
        endDate: user.activePlan.endDate,
        daysRemaining: user.getDaysRemaining()
      }
    });

  } catch (error) {
    console.error('Error renewing subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to renew subscription'
    });
  }
});

// Check subscription expiry (for cron jobs or manual checks)
router.get('/check-expiry', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const hasActiveSubscription = user.hasActiveSubscription();
    const daysRemaining = user.getDaysRemaining();
    
    let status = 'active';
    if (!hasActiveSubscription) {
      status = 'expired';
    } else if (daysRemaining <= 7) {
      status = 'expiring_soon';
    }

    res.json({
      success: true,
      status,
      daysRemaining,
      endDate: user.activePlan?.endDate || null,
      warningEmailSent: user.expiryWarningEmailSent || false
    });

  } catch (error) {
    console.error('Error checking expiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check subscription expiry'
    });
  }
});

module.exports = router;