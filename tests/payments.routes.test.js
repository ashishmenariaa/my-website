const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { stubModule, freshRequire, startApp, postJson } = require('./helpers');

process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';

const USER_ID = 'user_1';
const sign = (orderId, paymentId) => crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');

// ---- fakes ----
const calls = {};
let storedPayment;      // what Payment.findOneAndUpdate returns
let savedUser;
let userSaveFails;

class FakeRazorpay {
  constructor() {
    this.orders = {
      create: async (opts) => {
        calls.orderCreate = opts;
        return { id: 'order_123', amount: opts.amount, currency: opts.currency };
      }
    };
  }
}

const FakePayment = {
  create: async (doc) => { calls.paymentCreate = doc; return doc; },
  findOneAndUpdate: async (filter, update) => {
    calls.claimFilter = filter;
    return storedPayment ? { ...storedPayment, ...update } : null;
  },
  updateOne: async (filter, update) => { calls.rollback = { filter, update }; }
};

const FakeUser = {
  findById: async () => ({
    _id: USER_ID,
    save: async function () {
      if (userSaveFails) throw new Error('db write failed');
      savedUser = this;
    }
  })
};

stubModule('razorpay', FakeRazorpay);
stubModule('./models/payment', FakePayment);
stubModule('./models/user', FakeUser);
const router = freshRequire('./routes/payments');

let app;
beforeEach(async () => {
  for (const k of Object.keys(calls)) delete calls[k];
  storedPayment = undefined;
  savedUser = undefined;
  userSaveFails = false;
  app ??= await startApp('/api/payments', router, { _id: USER_ID });
});
after(() => app?.close());

test('create-order charges the server price, ignoring the amount sent by the browser', async () => {
  const res = await postJson(`${app.url}/create-order`, { planId: 'elite', amount: 1 });

  assert.equal(res.status, 200);
  assert.equal(calls.orderCreate.amount, 799900);
  assert.equal(calls.paymentCreate.planId, 'elite_12m');
  assert.equal(calls.paymentCreate.amount, 7999);
  assert.equal(res.body.amount, 799900);
});

test('create-order rejects unknown plans and the disabled ₹1 test plan', async () => {
  assert.equal((await postJson(`${app.url}/create-order`, { planId: 'free_forever' })).status, 400);
  assert.equal((await postJson(`${app.url}/create-order`, { planId: 'test_1rs' })).status, 400);
  assert.equal(calls.orderCreate, undefined);
});

test('verify rejects a bad signature before touching the database', async () => {
  const res = await postJson(`${app.url}/verify`, {
    razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_1', razorpay_signature: 'forged'
  });

  assert.equal(res.status, 400);
  assert.equal(calls.claimFilter, undefined);
});

test('verify activates the plan stored with the order, not the one in the request', async () => {
  storedPayment = { _id: 'p1', planId: 'starter_1m', amount: 999 };

  const res = await postJson(`${app.url}/verify`, {
    razorpay_order_id: 'order_123',
    razorpay_payment_id: 'pay_1',
    razorpay_signature: sign('order_123', 'pay_1'),
    planId: 'elite_12m', planName: 'Elite', amount: 7999, duration: 3650   // attacker-controlled, must be ignored
  });

  assert.equal(res.status, 200);
  assert.deepEqual(calls.claimFilter, { razorpayOrderId: 'order_123', userId: USER_ID, status: 'created' });
  assert.equal(savedUser.activePlan.planId, 'starter_1m');
  assert.equal(savedUser.activePlan.amount, 999);
  const days = Math.round((savedUser.activePlan.endDate - savedUser.activePlan.startDate) / 86400000);
  assert.equal(days, 30);
});

test('verify refuses an order that was already processed or belongs to someone else', async () => {
  storedPayment = null;

  const res = await postJson(`${app.url}/verify`, {
    razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_1', razorpay_signature: sign('order_123', 'pay_1')
  });

  assert.equal(res.status, 409);
  assert.equal(savedUser, undefined);
});

test('if activating the plan fails, the payment claim is released so the customer can retry', async () => {
  storedPayment = { _id: 'p1', planId: 'starter_1m', amount: 999 };
  userSaveFails = true;

  const res = await postJson(`${app.url}/verify`, {
    razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_1', razorpay_signature: sign('order_123', 'pay_1')
  });

  assert.equal(res.status, 500);
  assert.deepEqual(calls.rollback, { filter: { _id: 'p1' }, update: { status: 'created', paidAt: null } });
});
