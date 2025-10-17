# Copilot Instructions for SD Zone (Elite Trading Signals Platform)

## Project Architecture
- **Backend:** Node.js/Express server (`server.js`) with REST API routes for authentication (`routes/auth.js`), plans (`routes/plans.js`), and payments (`routes/payments.js`).
- **Database:** MongoDB via Mongoose. User model (`models/user.js`) includes subscription info.
- **Frontend:** Static HTML/CSS/JS in `public/`. Main pages: `index.html`, `login.html`, `plans.html`, `signup.html`, `subscriptions.html`.
- **Plans:** Defined in `config/plans.js` and used by both backend and frontend for consistency.

## Authentication & Session
- JWT-based auth, token stored in HTTP-only cookie (see `middleware/auth.js`).
- Frontend checks login state via `localStorage`/`sessionStorage` (see `plans.html` script).
- User info (name, email) and session are managed in `sessionStorage` after login.
- Logout must clear both `sessionStorage` and `localStorage` tokens, then redirect to `/login.html`.

## Navbar & UI Patterns
- Navbar should show profile avatar (first letter of user's name) and dropdown with name/email/logout if logged in; otherwise, only Login link.
- Subscription buttons in `plans.html` are disabled if not logged in, and prompt login if clicked.
- All UI changes must preserve animated backgrounds and responsive layout.

## Developer Workflows
- **Start server:** `npm start` or `npm run dev` (nodemon).
- **Environment:** Set `MONGO_URI` and `JWT_SECRET` in `.env` for local dev.
- **Add dependencies:** Use `npm install <package>`.
- **Testing:** No formal tests yet; use `/api/test` and `/api/auth/test` endpoints for basic health checks.

## Conventions & Patterns
- **API endpoints:** All under `/api/` (e.g., `/api/auth`, `/api/plans`).
- **Plan data:** Always use `config/plans.js` for plan definitions.
- **Session checks:** Frontend JS uses `sessionStorage` for user info and disables actions if not logged in.
- **Error handling:** API returns `{ success, message }` JSON for errors.
- **Security:** Payments are simulated; Razorpay integration is planned but not yet live.

## Key Files & Directories
- `server.js`: Main Express server setup
- `routes/`: API route handlers
- `models/user.js`: User schema and password hashing
- `config/plans.js`: Subscription plan definitions
- `public/`: Static frontend assets

## Integration Points
- **Payments:** Simulated in frontend; backend ready for Razorpay integration (`razorpay` in dependencies).
- **User session:** Managed via cookies (backend) and sessionStorage/localStorage (frontend).

## Example Patterns
- To check login state in frontend:
  ```js
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('user');
  if (token) { /* user is logged in */ }
  ```
- To protect API routes:
  ```js
  const { authenticate } = require('../middleware/auth');
  router.get('/protected', authenticate, (req, res) => { ... });
  ```

---

**If any section is unclear or missing, please provide feedback for further refinement.**
