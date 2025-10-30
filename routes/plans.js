//plans.js in routes
const express = require('express');
const plans = require('../config/plans');

const router = express.Router();

// Helper function to calculate days from months
function calculateDaysFromMonths(months) {
  return months * 30; // Approximate - you can adjust this
}

// Get all plans with enhanced info
router.get('/', (req, res) => {
  // Add durationDays to each plan if not already present
  const enhancedPlans = plans.map(plan => ({
    ...plan,
    durationDays: plan.durationDays || calculateDaysFromMonths(plan.durationMonths),
    // Calculate savings percentage if originalPrice exists
    savingsPercentage: plan.originalPrice 
      ? Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100)
      : 0
  }));

  res.json({
    success: true,
    plans: enhancedPlans
  });
});

// Get specific plan with enhanced info
router.get('/:planId', (req, res) => {
  const { planId } = req.params;
  
  const plan = plans.find(p => p.planId === planId);
  
  if (!plan) {
    return res.status(404).json({
      success: false,
      message: 'Plan not found'
    });
  }

  // Enhance the plan with additional calculated fields
  const enhancedPlan = {
    ...plan,
    durationDays: plan.durationDays || calculateDaysFromMonths(plan.durationMonths),
    savingsPercentage: plan.originalPrice 
      ? Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100)
      : 0,
    pricePerDay: Math.round(plan.price / (plan.durationDays || calculateDaysFromMonths(plan.durationMonths)))
  };
  
  res.json({
    success: true,
    plan: enhancedPlan
  });
});

module.exports = router;