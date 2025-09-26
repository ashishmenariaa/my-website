const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/user');
const Payment = require('../models/payment');
const plans = require('../config/plans');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Payment routes working!',
    razorpayConfigured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  });
});

// Create Razorpay order
router.post('/create-order', authenticate, async (req, res) => {
  try {
    console.log('🔄 Creating order for user:', req.user._id);
    console.log('📋 Request body:', req.body);
    
    const { planId } = req.body;
    console.log("🔑 Razorpay Key ID loaded:", process.env.RAZORPAY_KEY_ID ? true : false);
    console.log("🔑 Razorpay Key Secret loaded:", process.env.RAZORPAY_KEY_SECRET ? true : false);

    if (!planId) {
      console.log('❌ No planId provided');
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }

    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.log('❌ Razorpay keys not configured');
      return res.status(500).json({
        success: false,
        message: 'Payment system not configured. Please check Razorpay keys.'
      });
    }

    // Find plan
    const plan = plans.find(p => p.planId === planId);
    if (!plan) {
      console.log('❌ Invalid plan:', planId);
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }

    console.log('✅ Plan found:', plan.name);

    // Create a short receipt to avoid Razorpay length error
    const shortTimestamp = Date.now().toString().slice(-5); // last 5 digits
    const receipt = `${req.user._id}_${planId}_${shortTimestamp}`.substring(0, 40);

    // Create Razorpay order
    const orderOptions = {
      amount: plan.amountInPaise, // Amount in paise
      currency: 'INR',
      receipt: receipt,
      notes: {
        userId: req.user._id.toString(),
        planId: planId,
        planName: plan.name
      }
    };

    console.log('🔄 Creating Razorpay order with options:', orderOptions);

    const order = await razorpay.orders.create(orderOptions);
    console.log('✅ Razorpay order created:', order.id);

    // Save payment record
    const payment = new Payment({
      userId: req.user._id,
      planId: planId,
      planName: plan.name,
      amount: plan.price,
      razorpayOrderId: order.id,
      status: 'created'
    });

    await payment.save();
    console.log('✅ Payment record saved');

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        planName: plan.name,
        planId: planId
      },
      key: process.env.RAZORPAY_KEY_ID,
      userDetails: {
        name: req.user.name,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment order: ' + error.message
    });
  }
});


// Verify payment
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature, 
      planId 
    } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !planId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment details'
      });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Find payment record
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(400).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Find plan
    const plan = plans.find(p => p.planId === planId);
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan'
      });
    }

    // Update payment record
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    // Update user subscription
    const user = await User.findById(req.user._id);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + plan.durationMonths);

    user.activePlan = {
      planId: plan.planId,
      name: plan.name,
      price: plan.price,
      startDate: startDate,
      endDate: endDate
    };

    await user.save();

    res.json({
      success: true,
      message: 'Payment verified successfully',
      subscription: {
        planName: plan.name,
        startDate: startDate,
        endDate: endDate,
        daysRemaining: user.getDaysRemaining()
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment'
    });
  }
});

// Keep the simulate payment for testing
router.post('/simulate-payment', authenticate, async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }

    const plan = plans.find(p => p.planId === planId);
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }

    const user = await User.findById(req.user._id);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + plan.durationMonths);

    user.activePlan = {
      planId: plan.planId,
      name: plan.name,
      price: plan.price,
      startDate: startDate,
      endDate: endDate
    };

    await user.save();

    res.json({
      success: true,
      message: 'Payment simulated successfully! Subscription activated.',
      subscription: {
        planName: plan.name,
        startDate: startDate,
        endDate: endDate,
        daysRemaining: user.getDaysRemaining()
      }
    });
  } catch (error) {
    console.error('Simulate payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment simulation'
    });
  }
});

module.exports = router;