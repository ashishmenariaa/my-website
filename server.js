// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const cron = require('node-cron');
const { generateToken, setTokenCookie, authenticate, requireLogin } = require('./middleware/auth');

// Import User model
const User = require('./models/user');

// Import routes
const authRoutes = require('./routes/auth'); // ✅ ADD THIS
const plansRoutes = require('./routes/plans');
const paymentsRoutes = require('./routes/payments');
const contactRoutes = require('./routes/contact');
const tradingviewRoutes = require('./routes/tradingview'); // 🆕 TradingView routes

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
// Don't serve static files yet - we need to check auth first

// ----------------------
// Helper Functions
// ----------------------
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ----------------------
// PUBLIC Routes (No Authentication Required)
// ----------------------

// Public login/signup pages
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Health check (public)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Test API (public)
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date() });
});

// ✅ Auth routes (includes both public endpoints like /signup, /login AND protected endpoints like /me, /logout)
app.use('/api/auth', authRoutes);

// ----------------------
// PROTECTED Routes (Authentication Required)
// ----------------------

// ✅ Protect all API routes with authentication
app.use('/api/plans', authenticate, plansRoutes);
app.use('/api/payments', authenticate, paymentsRoutes);
app.use('/api/contact', authenticate, contactRoutes);
app.use('/api/tradingview', authenticate, tradingviewRoutes);

// ✅ Home route - redirect to login if not authenticated, else show dashboard
app.get('/', (req, res, next) => {
  const token = req.cookies?.token;
  
  if (!token) {
    return res.redirect('/login');
  }
  
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Add other protected pages here
app.get('/dashboard', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/profile', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/plans', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'plans.html'));
});

// ✅ Add any other protected pages as needed

// ✅ Serve static files AFTER protection routes
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------
// Cron Jobs
// ----------------------
cron.schedule('0 9 * * *', () => {
  console.log('⏰ Running daily expiry check at 9 AM');
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
  console.error('Error:', err.message);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      success: false, 
      message: Object.values(err.errors).map(e => e.message).join(', ')
    });
  }

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
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});