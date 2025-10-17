require('dotenv').config();
const { checkExpiringSubscriptions } = require('./config/cronJobs');
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const plansRoutes = require('./routes/plans');
const paymentsRoutes = require('./routes/payments');
const contactRoutes = require('./routes/contact'); // Move this here

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err.message));

// Basic middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/contact', contactRoutes); // Keep this here

// Basic route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Test API route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Server error: ' + err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Visit: http://localhost:${PORT}`);
});
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Visit: http://localhost:${PORT}`);
  
  // Start cron job
  checkExpiringSubscriptions.start();
  console.log('⏰ Expiry warning cron job started (runs daily at 9 AM)');
});