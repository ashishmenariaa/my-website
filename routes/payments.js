const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/user');
const Payment = require('../models/payment');
const plans = require('../config/plans');
const { authenticate } = require('../middleware/auth');
const transporter = require('../config/email');
const { purchaseConfirmationEmail } = require('../config/emailTemplates');

const router = express.Router();

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ✅ Test route (no auth needed, just for debugging server)
router.get('/test', (req, res) => {
  res.json({
    message: 'Payment routes working!',
    razorpayConfigured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  });
});

/**
 * ✅ Create Razorpay order
 * Requires: user must be logged in
 */
router.post('/create-order', authenticate, async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, message: 'Plan ID is required' });
    }

    // Check Razorpay keys
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: 'Razorpay keys not configured' });
    }

    // Find plan
    const plan = plans.find(p => p.planId === planId);
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    // Create unique receipt (max 40 chars allowed)
    const shortTimestamp = Date.now().toString().slice(-5);
    const receipt = `${req.user._id}_${planId}_${shortTimestamp}`.substring(0, 40);

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: plan.amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        userId: req.user._id.toString(),
        planId: plan.planId,
        planName: plan.name
      }
    });

    // Save payment record in DB
    await new Payment({
      userId: req.user._id,
      planId: plan.planId,
      planName: plan.name,
      amount: plan.price,
      razorpayOrderId: order.id,
      status: 'created'
    }).save();

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        planName: plan.name,
        planId: plan.planId
      },
      key: process.env.RAZORPAY_KEY_ID,
      userDetails: {
        name: req.user.name,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({ success: false, message: 'Error creating payment order: ' + error.message });
  }
});

/**
 * ✅ Verify Razorpay payment
 * Requires: user must be logged in
 */
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planId } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !planId) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    // Validate signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Find payment record
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(400).json({ success: false, message: 'Payment record not found' });
    }

    // Find plan
    const plan = plans.find(p => p.planId === planId);
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
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
      startDate,
      endDate
    };

    await user.save();

    // 📧 SEND PURCHASE CONFIRMATION EMAIL
    try {
      const expiryDate = endDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const planDetails = {
        name: plan.name,
        price: plan.price,
        duration: plan.durationMonths * 30, // Convert months to approximate days
        expiryDate: expiryDate
      };

      const mailOptions = purchaseConfirmationEmail(user.email, user.name, planDetails);
      await transporter.sendMail(mailOptions);
      
      console.log('✅ Purchase confirmation email sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Failed to send purchase email:', emailError);
      // Don't fail the payment if email fails
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      subscription: {
        planName: plan.name,
        startDate,
        endDate,
        daysRemaining: user.getDaysRemaining()
      }
    });
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({ success: false, message: 'Error verifying payment' });
  }
});

/**
 * ✅ Simulate payment (for testing only)
 * Requires: user must be logged in
 */
router.post('/simulate-payment', authenticate, async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, message: 'Plan ID is required' });
    }

    const plan = plans.find(p => p.planId === planId);
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    const user = await User.findById(req.user._id);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + plan.durationMonths);

    user.activePlan = {
      planId: plan.planId,
      name: plan.name,
      price: plan.price,
      startDate,
      endDate
    };

    await user.save();

    // 📧 SEND PURCHASE CONFIRMATION EMAIL (for simulated payment too)
    try {
      const expiryDate = endDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const planDetails = {
        name: plan.name,
        price: plan.price,
        duration: plan.durationMonths * 30, // Convert months to approximate days
        expiryDate: expiryDate
      };

      const mailOptions = purchaseConfirmationEmail(user.email, user.name, planDetails);
      await transporter.sendMail(mailOptions);
      
      console.log('✅ Purchase confirmation email sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Failed to send purchase email:', emailError);
      // Don't fail the payment if email fails
    }

    res.json({
      success: true,
      message: 'Payment simulated successfully! Subscription activated.',
      subscription: {
        planName: plan.name,
        startDate,
        endDate,
        daysRemaining: user.getDaysRemaining()
      }
    });
  } catch (error) {
    console.error('❌ Simulate payment error:', error);
    res.status(500).json({ success: false, message: 'Error processing payment simulation' });
  }
});

module.exports = router;