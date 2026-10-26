# SD Zone — Trading Tools Subscription Platform

[![CI](https://github.com/ashishmenariaa/my-website/actions/workflows/ci.yml/badge.svg)](https://github.com/ashishmenariaa/my-website/actions/workflows/ci.yml)

A live web app ([sdzone.shop](https://sdzone.shop)) where traders buy subscriptions to TradingView indicators. Users sign up, pay through Razorpay, and submit their TradingView username to get access. Subscriptions expire automatically.

**Stack:** Node.js · Express 5 · MongoDB / Mongoose · Razorpay · JWT (httpOnly cookie) · bcrypt · node-cron · Nodemailer · Helmet · express-rate-limit · `node:test`

## How payments work

```
Browser                         Server                                  Razorpay
  │ POST /create-order {planId} ─►│ price + duration from config/plans.js     │
  │                               │ Payment{status:"created"} saved ─────────►│ order created
  │◄── orderId, amount ───────────│                                           │
  │ checkout popup ──────────────────────────────────────────────────────────►│
  │◄──────────────────────────────────────────── payment_id + signature ──────│
  │ POST /verify ────────────────►│ 1. HMAC-SHA256 signature check (constant time)
  │                               │ 2. atomically claim the order:
  │                               │    {orderId, userId, status:"created"} → "paid"
  │                               │ 3. activate the plan stored with the order
```

**Guarantees** (each covered by a test in [`tests/`](tests)):
- The **price is decided by the server**. Any amount, plan or duration sent by the browser is ignored.
- A Razorpay payment activates **one** subscription, for **the account that created the order**. Replays get 409.
- If activation fails after the claim, the claim is released so the customer can retry.
- The ₹1 gateway-test plan can only be bought when `ENABLE_TEST_PLAN=true`.

## Security

- Passwords hashed with bcrypt; JWT kept in an `httpOnly`, `sameSite=lax` cookie (`secure` in production)
- The server refuses to start without `JWT_SECRET` (no fallback secret)
- Password-reset tokens: 256-bit random, **stored as SHA-256 hashes**, valid for 1 hour, and rejected if not a plain string (blocks MongoDB operator injection such as `{"$ne": null}`)
- Rate limit of 20 requests per 15 minutes per IP on login, signup, forgot-password and reset-password
- Helmet security headers, 100 KB request body limit
- Logs don't include passwords, reset tokens or email addresses

## Run locally

```bash
npm install
cp .env.example .env     # fill in MONGO_URI, JWT_SECRET, Razorpay test keys, email settings
npm run dev              # http://localhost:5000
npm test                 # 15 tests, no database or network needed
```

## Environment variables

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Signs login tokens (required) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay API keys |
| `EMAIL_USER`, `EMAIL_PASS`, `FRONTEND_URL` | Password-reset emails |
| `ENABLE_TEST_PLAN` | `true` to allow the ₹1 test plan (never in production) |
| `PORT`, `NODE_ENV` | Server port; `production` enables secure cookies |

## Project structure

```
server.js            Express app, security middleware, page routes, daily expiry cron
routes/              auth, payments (Razorpay + subscription status), plans, tradingview, contact
services/            paymentService: signature verification, subscription dates
config/plans.js      Single source of truth for plan prices and durations
models/              User, Payment
middleware/auth.js   JWT cookie authentication for API routes and pages
public/              Static HTML/CSS/JS frontend
tests/               node:test suites (routes run against in-memory fakes)
```

## Author

**Ashish Menaria**: [GitHub](https://github.com/ashishmenariaa) · [LinkedIn](https://www.linkedin.com/in/ashish-menaria-6593511a7/)
