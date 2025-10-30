// routes/payments.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// =============================================
// RAZORPAY PAYMENT ROUTES (ADD THESE)
// =============================================

// Create Razorpay order
router.post('/create-order', async (req, res) => {
  try {
    const { planId, amount, currency = 'INR' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    // Create order in Razorpay
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: currency,
      receipt: `order_${Date.now()}`,
      notes: {
        userId: req.userId || req.user._id,
        planId: planId
      }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order'
    });
  }
});

// Verify Razorpay payment
router.post('/verify', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
      planName,
      amount,
      duration
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Payment verified - Update user subscription
    const userId = req.userId || req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (parseInt(duration) || 30));

    // Update user's active plan
    user.activePlan = {
      planId: planId,
      planName: planName,
      amount: amount,
      startDate: startDate,
      endDate: endDate,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id
    };

    user.expiryWarningEmailSent = false;
    await user.save();

    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      subscription: {
        planName: planName,
        startDate: startDate,
        endDate: endDate,
        daysRemaining: parseInt(duration) || 30
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  }
});

// =============================================
// SUBSCRIPTION STATUS ROUTES (EXISTING)
// =============================================

// Get user's subscription details
router.get('/status', async (req, res) => {
  try {
    const userId = req.userId || req.user._id;
    const user = await User.findById(userId);
    
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
      subscriptionData.subscription.planName = user.activePlan.planName;
      subscriptionData.subscription.planId = user.activePlan.planId;
      subscriptionData.subscription.price = user.activePlan.amount;
      subscriptionData.subscription.amount = user.activePlan.amount;
      subscriptionData.subscription.startDate = user.activePlan.startDate;
      subscriptionData.subscription.endDate = user.activePlan.endDate;
      subscriptionData.subscription.expiryDate = user.activePlan.endDate;
    }

    // Add TradingView ID status
    if (user.tradingViewId) {
      subscriptionData.subscription.tradingViewId = user.tradingViewId;
      subscriptionData.subscription.tradingViewStatus = 'connected';
    } else {
      subscriptionData.subscription.tradingViewStatus = 'not_submitted';
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

    const userId = req.userId || req.user._id;
    const user = await User.findById(userId);
    
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
    const userId = req.userId || req.user._id;
    const user = await User.findById(userId);
    
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

module.exports = router;