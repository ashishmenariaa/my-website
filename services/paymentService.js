// services/paymentService.js
const crypto = require('crypto');

/**
 * Razorpay signs "order_id|payment_id" with the key secret (HMAC-SHA256, hex).
 * Compared in constant time so the signature can't be guessed byte by byte.
 */
function isValidRazorpaySignature(orderId, paymentId, signature, secret) {
  if (![orderId, paymentId, signature, secret].every(v => typeof v === 'string' && v.length > 0)) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(signature, 'utf8');
  return expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/** Start and end of a subscription bought now. Duration always comes from the server-side plan. */
function subscriptionWindow(plan, now = new Date()) {
  const startDate = new Date(now);
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + plan.durationDays);
  return { startDate, endDate };
}

module.exports = { isValidRazorpaySignature, subscriptionWindow };
