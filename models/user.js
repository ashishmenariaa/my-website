const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // Subscription fields
  activePlan: {
    planId: String,
    name: String,
    price: Number,
    startDate: Date,
    endDate: Date
  },
  // TradingView ID
  tradingViewId: {
    type: String,
    default: null,
    sparse: true
  },
  resetPasswordToken: {
    type: String,
    default: undefined
  },
  resetPasswordExpiry: {
    type: Date,
    default: undefined
  },
  expiryWarningEmailSent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Check if user has active subscription
UserSchema.methods.hasActiveSubscription = function() {
  if (!this.activePlan || !this.activePlan.endDate) {
    return false;
  }
  return new Date() < this.activePlan.endDate;
};

// Get days remaining in subscription
UserSchema.methods.getDaysRemaining = function() {
  if (!this.hasActiveSubscription()) {
    return 0;
  }
  const now = new Date();
  const endDate = new Date(this.activePlan.endDate);
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// Prevent password from appearing in toJSON
UserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);