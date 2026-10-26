const plans = [
  {
    planId: "starter_1m",
    name: "Starter",
    durationMonths: 1,
    durationDays: 30,
    price: 999,
    originalPrice: 1499,
    amountInPaise: 99900,
    description: "Perfect for beginners starting their trading journey",
    features: [
      "High-probability zone detection",
      "Real-time chart updates",
      "Email support",
      "30 days access"
    ]
  },
  {
    planId: "professional_3m",
    name: "Professional",
    durationMonths: 3,
    durationDays: 90,
    price: 2499,
    amountInPaise: 249900,
    originalPrice: 2997,
    description: "Most popular choice for serious traders",
    popular: true,
    features: [
      "High-probability zone detection",
      "Real-time chart updates",
      "Priority email support",
      "90 days access",
      "Weekly market insights"
    ]
  },
  {
    planId: "expert_6m",
    name: "Expert",
    durationMonths: 6,
    durationDays: 180,
    price: 4499,
    amountInPaise: 449900,
    originalPrice: 5994,
    description: "Advanced package for experienced traders",
    features: [
      "High-probability zone detection",
      "Real-time chart updates",
      "Priority email & phone support",
      "180 days access",
      "Weekly market analysis",
      "Custom alerts"
    ]
  },
  {
    planId: "elite_12m",
    name: "Elite",
    durationMonths: 12,
    durationDays: 365,
    price: 7999,
    amountInPaise: 799900,
    originalPrice: 11988,
    description: "Ultimate trading experience with VIP support",
    features: [
      "High-probability zone detection",
      "Real-time chart updates",
      "VIP support (24/7)",
      "365 days access",
      "Personal trading mentor",
      "Live Zoom classes (Sat & Sun)",
      "Exclusive strategies"
    ]
  },

  // ✅ TEST PLAN (For ₹1 Payment Gateway Testing) — only purchasable when ENABLE_TEST_PLAN=true
  {
    planId: "test_1rs",
    testOnly: true,
    name: "Test Plan (₹1)",
    durationMonths: 1,
    durationDays: 30,
    price: 1,
    amountInPaise: 100,
    description: "Test plan for payment gateway testing",
    features: [
      "Payment testing only",
      "30 days validity"
    ]
  }
];

// Older pages use short ids; map them to the canonical plan ids
const PLAN_ALIASES = {
  starter: "starter_1m",
  professional: "professional_3m",
  expert: "expert_6m",
  elite: "elite_12m"
};

const testPlanEnabled = () => process.env.ENABLE_TEST_PLAN === "true";

/** Plans a customer can see and buy. The ₹1 test plan is hidden unless explicitly enabled. */
function purchasablePlans() {
  return plans.filter(plan => !plan.testOnly || testPlanEnabled());
}

/** Server-side source of truth for price and duration. Returns undefined for unknown or disabled plans. */
function findPlan(planId) {
  if (typeof planId !== "string") return undefined;
  const id = PLAN_ALIASES[planId] || planId;
  return purchasablePlans().find(plan => plan.planId === id);
}

module.exports = plans;
module.exports.purchasablePlans = purchasablePlans;
module.exports.findPlan = findPlan;
