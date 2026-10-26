const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { isValidRazorpaySignature, subscriptionWindow } = require('../services/paymentService');
const plans = require('../config/plans');

const SECRET = 'rzp_secret';
const sign = (orderId, paymentId) =>
  crypto.createHmac('sha256', SECRET).update(`${orderId}|${paymentId}`).digest('hex');

test('accepts a correct Razorpay signature', () => {
  assert.equal(isValidRazorpaySignature('order_1', 'pay_1', sign('order_1', 'pay_1'), SECRET), true);
});

test('rejects a signature for a different payment', () => {
  assert.equal(isValidRazorpaySignature('order_1', 'pay_2', sign('order_1', 'pay_1'), SECRET), false);
});

test('rejects malformed and non-string input without throwing', () => {
  assert.equal(isValidRazorpaySignature('order_1', 'pay_1', 'short', SECRET), false);
  assert.equal(isValidRazorpaySignature('order_1', 'pay_1', { $ne: null }, SECRET), false);
  assert.equal(isValidRazorpaySignature(undefined, 'pay_1', 'x', SECRET), false);
  assert.equal(isValidRazorpaySignature('order_1', 'pay_1', sign('order_1', 'pay_1'), undefined), false);
});

test('subscription length comes from the plan', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const { startDate, endDate } = subscriptionWindow({ durationDays: 90 }, now);
  assert.equal(startDate.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(endDate.toISOString(), '2026-04-01T00:00:00.000Z');
});

test('short plan ids used by older pages map to real plans', () => {
  assert.equal(plans.findPlan('elite').planId, 'elite_12m');
  assert.equal(plans.findPlan('starter_1m').price, 999);
  assert.equal(plans.findPlan('nope'), undefined);
  assert.equal(plans.findPlan({ $gt: '' }), undefined);
});

test('the ₹1 test plan is hidden unless ENABLE_TEST_PLAN=true', () => {
  delete process.env.ENABLE_TEST_PLAN;
  assert.equal(plans.findPlan('test_1rs'), undefined);
  assert.ok(plans.purchasablePlans().every(p => !p.testOnly));

  process.env.ENABLE_TEST_PLAN = 'true';
  assert.equal(plans.findPlan('test_1rs').price, 1);
  delete process.env.ENABLE_TEST_PLAN;
});
