//auth.js in routes
const express = require('express');
const User = require('../models/user');
const { generateToken, setTokenCookie, authenticate } = require('../middleware/auth');
const crypto = require('crypto');
const { forgotPasswordEmail } = require('../config/emailTemplates');
const transporter = require('../config/email');

const router = express.Router();


// ✅ Test route (PUBLIC - for debugging)
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working!' });
});

// ✅ Register user (PUBLIC)
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
  const user = new User({
  name: name.trim(),
  email: email.toLowerCase(),
  password: password // ← CORRECT
});

    await user.save();

    // Generate token and set cookie
    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// ✅ Login user (PUBLIC)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt for:', email);

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('❌ User not found');
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('👤 User found:', user.email);

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    console.log('✅ Password valid?', isPasswordValid);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token and set cookie
    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// ✅ Get current user (PROTECTED - requires authentication)
router.get('/me', authenticate, (req, res) => {
  try {
    console.log('AUTH /me:', {
      user: req.user ? { id: req.user._id, email: req.user.email, name: req.user.name } : null
    });

    if (!req.user || !req.user.email || !req.user.name) {
      console.log('AUTH /me: Not authenticated');
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        activePlan: req.user.activePlan,
        hasActiveSubscription: req.user.hasActiveSubscription(),
        daysRemaining: req.user.getDaysRemaining()
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ Logout (PROTECTED - requires authentication)
router.post('/logout', authenticate, async (req, res) => {
  try {
    res.clearCookie('token');
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// ✅ Forgot password (PUBLIC)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    console.log('📧 Forgot password request for:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log('❌ User not found:', email);
      // Don't reveal if email exists or not (security best practice)
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link will be sent'
      });
    }

    console.log('✅ User found:', user.email);

    // Generate reset token (32 bytes = 64 hex characters)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

    console.log('🔑 Generated token:', resetToken);
    console.log('⏰ Token expiry:', new Date(resetTokenExpiry));

    // Save token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    console.log('💾 Token saved to database');

    // Send email
    const mailOptions = forgotPasswordEmail(email, resetToken, user.name);
    await transporter.sendMail(mailOptions);

    console.log('📧 Reset email sent to:', email);

    res.json({
      success: true,
      message: 'Password reset link has been sent to your email'
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request. Please try again later.'
    });
  }
});

// ✅ Reset password (PUBLIC - but requires valid token)
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    console.log('🔍 Reset password request');
    console.log('⏰ Current time:', new Date());

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required'
      });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() }
    });

    console.log('👤 User found:', user ? 'YES ✅' : 'NO ❌');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    console.log('📧 User email:', user.email);
    console.log('🔧 Setting new password (will be hashed by pre-save)');

    // Set password directly (pre-save hook will hash it)
    user.passwordHash = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;

    console.log('💾 Saving user...');
    await user.save();

    console.log('✅ Password updated successfully for:', user.email);

    res.json({
      success: true,
      message: 'Password reset successfully! You can now login with your new password.'
    });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again.'
    });
  }
});

module.exports = router;