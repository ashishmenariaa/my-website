const express = require('express');
const plans = require('../config/plans');

const router = express.Router();

// Get all plans
router.get('/', (req, res) => {
  res.json({
    success: true,
    plans: plans
  });
});

// Get specific plan
router.get('/:planId', (req, res) => {
  const { planId } = req.params;
  
  const plan = plans.find(p => p.planId === planId);
  
  if (!plan) {
    return res.status(404).json({
      success: false,
      message: 'Plan not found'
    });
  }
  
  res.json({
    success: true,
    plan: plan
  });
});

module.exports = router;