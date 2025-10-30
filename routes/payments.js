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
// RAZORPAY PAYMENT ROUTES
// =============================================

// Create Razorpay order
router.post('/create-order', async (req, res) => {
  try {
    const { planId, amount, currency = 'INR' } = req.body;

    console.log('💰 Creating order:', { planId, amount, userId: req.user._id });

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    // Create order in Razorpay
    const options = {
      amount: amount * 100, // Convert to paise
      currency: currency,
      receipt: `order_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        planId: planId
      }
    };

    const order = await razorpay.orders.create(options);

    console.log('✅ Order created:', order.id);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
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

    console.log('🔍 Verifying payment:', { razorpay_order_id, razorpay_payment_id });

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.log('❌ Signature verification failed');
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    console.log('✅ Signature verified');

    // Update user subscription
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate dates
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
      status: 'active'
    };

    user.expiryWarningEmailSent = false;
    await user.save();

    console.log('✅ Subscription activated for:', user.email);

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
    console.error('❌ Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  }
});

// =============================================
// SUBSCRIPTION STATUS ROUTES
// =============================================

// Get subscription status
router.get('/status', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const hasActiveSubscription = user.hasActiveSubscription();
    const daysRemaining = user.getDaysRemaining();

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
      subscriptionData.subscription.amount = user.activePlan.amount;
      subscriptionData.subscription.startDate = user.activePlan.startDate;
      subscriptionData.subscription.endDate = user.activePlan.endDate;
    }

    // Add TradingView status
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

// Submit TradingView ID
router.post('/tradingview-id', async (req, res) => {
  try {
    const { tradingViewId } = req.body;

    if (!tradingViewId || !tradingViewId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'TradingView ID is required'
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.hasActiveSubscription()) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required'
      });
    }

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

// Get TradingView ID
router.get('/tradingview-id', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
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