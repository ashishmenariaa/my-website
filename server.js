// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const cron = require('node-cron');

// Import routes
const plansRoutes = require('./routes/plans');
const paymentsRoutes = require('./routes/payments');
const contactRoutes = require('./routes/contact');

const app = express();

// ----------------------
// MongoDB Connection
// ----------------------
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// ----------------------
// Middleware
// ----------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------
// User Schema & Model
// ----------------------
const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    match: /.+\@.+\..+/
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

// Remove password from responses
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

// ----------------------
// Helper Functions
// ----------------------
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ----------------------
// Routes
// ----------------------

// Register
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = new User({ 
      name: name.trim(), 
      email: email.toLowerCase(), 
      password 
    });
    await user.save();

    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully',
      user: user.toJSON()
    });
  } catch (err) {
    next(err);
  }
});

// Login (basic example - add JWT in production)
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // TODO: Generate JWT token instead
    res.json({ 
      success: true, 
      message: 'Login successful',
      user: user.toJSON()
    });
  } catch (err) {
    next(err);
  }
});

// Import route handlers
app.use('/api/plans', plansRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/contact', contactRoutes);

// Test API
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date() });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----------------------
// Cron Jobs
// ----------------------
cron.schedule('0 9 * * *', () => {
  console.log('⏰ Running daily expiry check at 9 AM');
  // checkExpiringSubscriptions();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// ----------------------
// Error Handling
// ----------------------
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      success: false, 
      message: Object.values(err.errors).map(e => e.message).join(', ')
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({ 
      success: false, 
      message: 'This record already exists'
    });
  }

  res.status(err.status || 500).json({ 
    success: false, 
    message: process.env.NODE_ENV === 'production' 
      ? 'Server error' 
      : err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ----------------------
// Start Server
// ----------------------
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Visit: http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
app.get('/api/test-email', async (req, res) => {
     const sgMail = require('@sendgrid/mail');
     sgMail.setApiKey(process.env.SENDGRID_API_KEY);
     
     try {
       await sgMail.send({
         to: 'help.sdzone@gmail.com',
         from: process.env.EMAIL_USER,
         subject: 'Test',
         html: '<p>Test</p>'
       });
       res.json({ success: true });
     } catch (err) {
       res.json({ error: err.message });
     }
   });