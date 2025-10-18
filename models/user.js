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
  passwordHash: {
    type: String,
    required: true
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
  // ✅ Password reset fields
  resetPasswordToken: {
    type: String,
    default: undefined
  },
  resetPasswordExpiry: {
    type: Date,
    default: undefined
  },
  // ✅ Email notification field
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
  if (!this.isModified('passwordHash')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.passwordHash);
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

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);