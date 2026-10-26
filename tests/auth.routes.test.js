const { test, after, before } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { stubModule, freshRequire, startApp, postJson } = require('./helpers');

process.env.JWT_SECRET = 'test-jwt-secret';

let lastQuery;
let userToReturn;

const FakeUser = {
  findOne: async (query) => { lastQuery = query; return userToReturn; }
};

stubModule('./models/user', FakeUser);
stubModule('./config/email', { sendMail: async () => {} });
const router = freshRequire('./routes/auth');

let app;
before(async () => { app = await startApp('/api/auth', router, undefined); });
after(() => app.close());

test('reset-password rejects MongoDB operator objects instead of querying with them', async () => {
  lastQuery = undefined;

  const res = await postJson(`${app.url}/reset-password`, { token: { $ne: null }, password: 'NewPassword1' });

  assert.equal(res.status, 400);
  assert.equal(lastQuery, undefined);
});

test('reset-password looks up the hashed token and actually changes the password', async () => {
  const saved = {};
  userToReturn = {
    _id: 'u1',
    save: async function () { Object.assign(saved, this); }
  };

  const res = await postJson(`${app.url}/reset-password`, { token: 'raw-token', password: 'NewPassword1' });

  assert.equal(res.status, 200);
  assert.equal(lastQuery.resetPasswordToken, crypto.createHash('sha256').update('raw-token').digest('hex'));
  assert.equal(saved.password, 'NewPassword1');
  assert.equal(saved.resetPasswordToken, undefined);
});

test('forgot-password stores only a hash of the emailed token', async () => {
  const saved = {};
  userToReturn = {
    _id: 'u2', name: 'Asha',
    save: async function () { Object.assign(saved, this); }
  };

  const res = await postJson(`${app.url}/forgot-password`, { email: 'asha@example.com' });

  assert.equal(res.status, 200);
  assert.match(saved.resetPasswordToken, /^[0-9a-f]{64}$/);
  assert.ok(saved.resetPasswordExpiry > Date.now());
});
