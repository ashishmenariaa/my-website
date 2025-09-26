const plans = [
  {
    planId: "bronze_1m",
    name: "Bronze",
    durationMonths: 1,
    price: 999,
    amountInPaise: 99900, // Razorpay expects amount in paise
    description: "1 month access to TradingIndicatorPro",
    features: [
      "Real-time trading signals",
      "87% accuracy rate",
      "Email support",
      "Basic indicator access"
    ]
  },
  {
    planId: "silver_3m",
    name: "Silver",
    durationMonths: 3,
    price: 2499,
    amountInPaise: 249900,
    description: "3 months access to TradingIndicatorPro",
    features: [
      "Real-time trading signals",
      "87% accuracy rate",
      "Priority email support",
      "Advanced indicators",
      "Market analysis reports"
    ]
  },
  {
    planId: "gold_6m",
    name: "Gold",
    durationMonths: 6,
    price: 4999,
    amountInPaise: 499900,
    description: "6 months access to TradingIndicatorPro",
    features: [
      "All Silver features",
      "Custom alerts",
      "Weekly market analysis",
      "Phone support"
    ]
  }
];

module.exports = plans;