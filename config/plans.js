const plans = [
  {
    planId: "starter_1m",
    name: "Starter",
    durationMonths: 1,
    price: 999,
    amountInPaise: 99900, // Razorpay expects amount in paise
    description: "Perfect for beginners starting their trading journey",
    features: [
      "Real-time trading signals",
      "89% accuracy rate",
      "Email support",
      "Basic indicator access"
    ]
  },
  {
    planId: "professional_3m",
    name: "Professional",
    durationMonths: 3,
    price: 2499,
    amountInPaise: 249900,
    originalPrice: 2997,
    description: "Most popular choice for serious traders",
    features: [
      "All Starter features",
      "Priority support",
      "Advanced indicators",
      "Market analysis reports",
      "SMS alerts"
    ]
  },
  {
    planId: "expert_6m",
    name: "Expert",
    durationMonths: 6,
    price: 4499,
    amountInPaise: 449900,
    originalPrice: 5994,
    description: "Advanced package for experienced traders",
    features: [
      "All Professional features",
      "Custom alerts",
      "Weekly market analysis",
      "Phone support",
      "Advanced risk management"
    ]
  },
  {
    planId: "elite_12m",
    name: "Elite",
    durationMonths: 12,
    price: 7999,
    amountInPaise: 799900,
    originalPrice: 11988,
    description: "Ultimate trading experience with VIP support",
    features: [
      "All Expert features",
      "VIP support hotline",
      "Custom strategy development",
      "1-on-1 trading sessions",
      "Lifetime updates"
    ]
  }
];

module.exports = plans;