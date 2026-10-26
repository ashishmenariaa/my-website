// routes/payments.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Payment = require('../models/payment');
const plans = require('../config/plans');
const { findPlan } = require('../config/plans');
const { isValidRazorpaySignature, subscriptionWindow } = require('../services/paymentService');
const Razorpay = require('razorpay');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// =============================================
// RAZORPAY PAYMENT ROUTES
// =============================================

// Create Razorpay order.
// Only planId is taken from the client: price and duration come from config/plans.js.
router.post('/create-order', async (req, res) => {
  try {
    const plan = findPlan(req.body.planId);

    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Unknown plan'
      });
    }

    const order = await razorpay.orders.create({
      amount: plan.amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        planId: plan.planId
      }
    });

    await Payment.create({
      userId: req.user._id,
      planId: plan.planId,
      planName: plan.name,
      amount: plan.price,
      currency: 'INR',
      razorpayOrderId: order.id
    });

    console.log(`💰 Order ${order.id} created for plan ${plan.planId}`);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order'
    });
  }
});

// Verify Razorpay payment and activate the plan that was stored when the order was created.
// Plan, amount and duration fields in the request body are ignored.
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!isValidRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature,
                                  process.env.RAZORPAY_KEY_SECRET)) {
      console.log('❌ Signature verification failed');
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Atomically claim the order: it must belong to this user and not be processed yet,
    // so the same payment can't be replayed or used by another account.
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id, userId: req.user._id, status: 'created' },
      {
        status: 'paid',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidAt: new Date()
      },
      { new: true }
    );

    if (!payment) {
      return res.status(409).json({
        success: false,
        message: 'This payment has already been processed or does not belong to your account'
      });
    }

    const plan = plans.find(p => p.planId === payment.planId);
    const { startDate, endDate } = subscriptionWindow(plan);

    try {
      const user = await User.findById(req.user._id);
      user.activePlan = {
        planId: plan.planId,
        planName: plan.name,
        amount: payment.amount,
        startDate,
        endDate,
        status: 'active'
      };
      user.expiryWarningEmailSent = false;
      await user.save();
    } catch (activationError) {
      // Release the claim so the customer can retry verification instead of being stuck as "already processed"
      await Payment.updateOne({ _id: payment._id }, { status: 'created', paidAt: null });
      throw activationError;
    }

    console.log(`✅ Subscription ${plan.planId} activated for user ${req.user._id}`);

    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      subscription: {
        planName: plan.name,
        startDate,
        endDate,
        daysRemaining: plan.durationDays
      }
    });

  } catch (error) {
    console.error('❌ Error verifying payment:', error.message);
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