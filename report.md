# Crypto Index Asset — Current-State Repository Audit

> **Audit date:** 2026-09-01  
> **Repository:** `cryptoindexasset`  
> **Legacy package name:** `coddle`  
> **Purpose:** Shared technical and product context for future agents and modernization work.  
> **Audit scope:** Read-only repository inspection. No application files, database records, or external services were modified.

## Executive Summary

Crypto Index Asset is a legacy cryptocurrency investment and copy-trading website originally assembled in 2021. It presents itself as a crypto copy-trading SaaS, but its implemented system is more accurately a marketing website plus a manually operated customer-balance and withdrawal-management portal.

The repository contains:

- A public crypto-investment marketing website.
- User registration and login.
- A multi-currency user balance dashboard.
- TradingView charts and market tickers.
- Admin-configured deposit wallet addresses.
- Crypto-wallet and bank withdrawal requests.
- A back office for manually editing users, balances, trader profiles, wallets, and withdrawal statuses.
- A switch controlling whether a user can see the TradingView trading-signal chart.

It does **not** contain a real copy-trading engine, exchange integration, automated profit engine, blockchain deposit monitoring, payment gateway, or automated withdrawal processor.

## 1. Current Architecture

The application is a single-process, server-rendered Node.js monolith:

```text
Browser
   |
   |-- Public marketing pages
   |-- User dashboard
   `-- Admin panel
            |
            v
Express.js routes
            |
            v
One large controller
            |
            v
Mongoose models
            |
            v
MongoDB Atlas

External browser integrations:
   |-- TradingView widgets
   |-- Google Fonts and other CDNs
   `-- External Gemini deposit link
```

The server entry point is `server.js`. It:

- Loads environment variables using `dotenv`.
- Starts Express.
- Enables JSON and URL-encoded form parsing.
- Serves `public/` as static assets.
- Uses EJS for server-rendered HTML.
- Connects to MongoDB through `DB_URI`.
- Enables HTTPS redirection only when `NODE_ENV=production`.
- Mounts user routes at `/user`.
- Mounts admin routes at `/panel/admin`.
- Listens on `PORT`, falling back to port 3000.

This is an MVC-like structure, but business logic, validation, authentication, rendering, and financial operations are heavily concentrated in the 561-line `controller/controller.js` file.

## 2. Technology Stack

### Backend

- Node.js, declared as `15.x` in `package.json`.
- npm, declared as `7.x`.
- Express `4.17.1`.
- CommonJS modules using `require()`.
- EJS `3.1.6`.
- Mongoose `6.0.11` installed (`^6.0.9` declared).
- MongoDB Atlas.
- No TypeScript.
- No separate REST or GraphQL API layer.
- No background worker, job scheduler, queue, or event system.

The audit machine had Node `24.11.1`, which is significantly newer than the project's declared Node 15 runtime. The server-side files pass syntax checking, but full runtime compatibility was not established.

### Authentication and security libraries

- `bcryptjs` for password hashing.
- `jsonwebtoken` for seven-day user and admin JWTs.
- `cookie-parser` for JWT cookies.
- `csurf`, although CSRF protection is inconsistently and incorrectly applied.
- `express-sslify` for production HTTPS redirects.
- `validator` for basic email validation.

### Frontend

- EJS templates.
- Vanilla JavaScript.
- jQuery.
- Bootstrap 4 assets.
- Bootstrap 5.1 assets.
- Bootstrap Icons.
- Font Awesome.
- Themify Icons.
- Owl Carousel.
- Magnific Popup.
- Vendored dashboard-theme CSS and JavaScript.
- Large amounts of inline CSS and JavaScript.
- TradingView embedded widgets and iframes.

There is no React, Next.js, Vite, Tailwind CSS, shadcn/ui, component library, design-token system, frontend build pipeline, or client-side state-management system.

### Deployment and operations

The only production configuration is the Heroku-style `Procfile`:

```text
web: node server.js
```

There is no:

- Dockerfile.
- PM2 configuration.
- Nginx configuration.
- Vercel configuration.
- CI/CD workflow.
- Health-check endpoint.
- Structured logging.
- Metrics or tracing.
- Automated backup process.
- Deployment rollback configuration.

The `npm start` script uses `nodemon`, which is a development tool rather than a suitable production process manager.

## 3. Intended Product

The public content markets the platform as a service where investors:

- Select successful traders.
- Deposit cryptocurrency.
- Copy trades automatically.
- Receive profits from mirrored trades.
- Pay commissions on profitable transactions.
- Access trading signals.
- Withdraw to crypto wallets or bank accounts.

These claims are present in `views/home.ejs` and `views/investors.ejs`. They are not backed by an implemented trading engine.

In the code, a copy trader is only a marketing record containing:

- Name.
- Claimed trading accuracy.
- Number of copiers.
- Availability flag.

There are no exchange credentials, orders, positions, portfolios, trader subscriptions, commissions, strategies, trades, trade mirroring, P&L calculations, or trader-to-user relationships.

## 4. Public Website

Implemented public routes include:

- `/`
- `/about`
- `/investors`
- `/contact`
- `/login`
- `/register`
- `/forgotpassword`
- `/terms`
- `/policy`

The public website contains:

- Hero sections and investment calls to action.
- Marketing descriptions.
- Top-trader cards loaded from MongoDB.
- Testimonials.
- Crypto-investment content.
- Contact information.
- Newsletter forms with no backend.
- Static news/blog excerpts.
- Legacy 2021 copyright and branding.

Important problems:

- `/terms` and `/policy` render scraped "Not Found" pages rather than legal documents.
- The forgot-password page has no corresponding POST handler or password-reset implementation.
- Some links still point to `.html` files even though the runtime uses EJS routes.
- Branding alternates between "Crypto Index Asset" and "Crypto Index Market."
- Metadata still contains claims such as "Best Bitcoin social trading company 2016."

## 5. User Portal

User routes are defined in `routes/routes.js`.

### Registration and login

Registration:

1. Creates a bcrypt password hash.
2. Creates a `User` document.
3. Separately creates Finance, Currency, Paid, and LastLogin documents.
4. Issues a seven-day JWT in an HttpOnly `jid` cookie.
5. Redirects to the user dashboard.

These database writes are not transactional. A partial failure can leave a user without one or more supporting records.

### Dashboard

The dashboard displays:

- BTC balance.
- ETH balance.
- BCH balance.
- LTC balance.
- XRP balance.
- USDT balance.
- "Portfolio Signal" paid/unpaid status.
- "Tax Payment" paid/unpaid status.
- TradingView ticker tape.
- TradingView BTC and crypto-market chart.

The signal and tax statuses are both driven by the same `showSignal` Boolean, so they are not independent financial states.

### Deposits

There is no proper deposit-processing workflow.

- The sidebar Deposit link opens `gemini.com` externally.
- `/user/address` shows wallet addresses configured by an administrator.
- No unique per-user deposit addresses are created.
- No transaction hash is submitted.
- No blockchain confirmations are monitored.
- No deposit proof is uploaded.
- No deposit record or approval model exists.

### Withdrawals

Users can request withdrawal to:

- A cryptocurrency wallet.
- A bank account.

The system records the amount, currency, destination, and bank/wallet details. The request appears in the admin panel for manual approval or decline.

This is only a request-tracking flow:

- The balance is not reserved when a request is created.
- The balance is not automatically reduced.
- Approval changes the request status but does not transfer funds.
- No blockchain or banking provider is integrated.

### Profile and nominal 2FA

The two-factor feature only changes a Boolean database value. It does not implement:

- TOTP.
- QR-code enrollment.
- OTP verification.
- Recovery codes.
- Email or SMS challenges.
- Step-up authentication.

It must not currently be treated as real two-factor authentication.

### Support

The support page is presentation-only. There is no support-ticket model, messaging system, attachment handling, or administrative support inbox.

## 6. Administrative Panel

Admin routes are defined in `routes/router.js`.

Administrators can:

- Log in.
- Register another admin.
- List users.
- View and edit a user.
- Block or unblock users.
- Soft-disable users.
- Toggle signal visibility.
- Manually credit or debit balances.
- Review withdrawal requests.
- Approve or decline requests.
- Record payments.
- Create and update top-trader marketing profiles.
- Create or update global deposit wallet addresses.

The admin panel is the functional center of the application because most financial state is managed manually.

## 7. MongoDB Data Model

| Model | Purpose |
|---|---|
| `User` | Name, email, phone, bcrypt password, blocked/status flags, signal flag, nominal 2FA flag |
| `Admin` | Admin username and bcrypt password |
| `Currency` | Six manually maintained crypto balances |
| `Finance` | Payment/request counters and totals |
| `Paid` | Basic manually recorded payment history |
| `Withdrawal` | Raw submitted withdrawal information |
| `Request` | Admin-facing pending withdrawal request and status |
| `Wallet` | Global crypto deposit addresses |
| `Traders` | Marketing profiles for top traders |
| `LastLogin` | Raw JWT token and login timestamp |

The financial data model is unsafe for a modern financial platform:

- Balances use JavaScript/MongoDB floating-point `Number` values.
- There is no immutable ledger.
- There are no double-entry accounting records.
- Balances can be edited directly.
- Operations have no idempotency keys.
- Balance changes are not tied to immutable audit entries.
- Email is used as the relationship between several collections.
- There are no relational foreign keys.
- There is no supported-currency lifecycle model.
- There is no available-versus-locked balance distinction.

## 8. Critical Security and Integrity Findings

These issues must be addressed before production reuse:

1. **`.env` is tracked in Git.** There is no `.gitignore`, and database/JWT secrets may exist throughout Git history. All affected credentials must eventually be rotated.
2. **Public admin registration exists.** Both GET and POST admin-registration endpoints are unprotected.
3. **CSRF protection is ineffective.** Tokens are rendered on some pages, but POST routes generally do not apply CSRF middleware. The withdrawal form uses `_csrfToken`, while `csurf` normally expects `_csrf`.
4. **Withdrawal identity is client-controlled.** The JWT is verified, but the backend then reads the target account email from the submitted request body.
5. **Negative and malformed financial amounts are not safely rejected.**
6. **Withdrawal balances are not reserved or atomically updated.**
7. **Admin credit/debit operations accept unsanitized body values and directly change balances.**
8. **Money uses floating-point numbers rather than decimals or integer base units.**
9. **Admin user editing uses mass assignment.** The complete submitted body is passed to `findByIdAndUpdate`.
10. **The edit-user form exposes the stored password hash as an input value.**
11. **JWT cookies lack production protections** such as `secure`, `sameSite`, and explicit environment-aware lifetimes.
12. **Raw JWTs are stored in MongoDB** through the `LastLogin` model.
13. **Authentication middleware throws inside JWT callbacks**, potentially producing uncaught application errors instead of controlled 401/403 responses.
14. **Many failures return HTTP 200**, including invalid login and failed financial operations.
15. **No rate limiting, account lockout, password-reset security, audit log, RBAC permission model, or security headers are implemented.**
16. **Most routes have no schema-based input validation.**
17. **No automated tests protect authentication or financial workflows.**

## 9. Repository History and Likely Origin

Git history starts on October 20, 2021. The initial commit introduced almost the entire application, including:

- `node_modules`.
- Static HTML pages.
- Dashboard templates.
- Backend code.
- Public assets.
- `.env`.

The `scrape.py` file explicitly downloads content from `cryptoindexmarkets.com`. Together with the following evidence:

- Top-level archived HTML pages.
- Scrape-report metadata.
- Mixed "Crypto Index Market" and "Crypto Index Asset" branding.
- Duplicate static HTML and EJS pages.
- Multiple unrelated CSS frameworks.

This strongly suggests that the public site began as scraped or imported site/template material and was later adapted into an Express/EJS application.

The top-level `.html` files and `dashboard/*.html` files are generally not part of the active runtime because Express serves only `public/` and renders EJS templates. They are legacy source or reference artifacts.

Later commits mainly changed database environment configuration and a small number of homepage images/texts. There has been little architectural evolution since 2021.

## 10. Engineering Maturity

- Server-side JavaScript syntax: passes `node --check`.
- Automated tests: none.
- Linting: none.
- Type checking: none.
- Build pipeline: none.
- CI/CD: none.
- API documentation: none.
- Database migrations: none.
- Seed scripts: none.
- Observability: console logging only.
- Central error middleware: none.
- Development/production dependency separation: none.
- `node_modules`: committed to Git.
- `.gitignore`: missing.
- Git working tree: contains pre-existing user-owned modifications and untracked architecture files.
- MongoDB: `memory.md` records an Atlas IP-access-list connection failure. The database was not contacted during this audit.

## 11. Modernization Implications

This repository is useful as a product prototype and requirements reference, especially for understanding:

- The intended brand.
- Public marketing content.
- User journeys.
- Dashboard information architecture.
- Admin workflows.
- Supported currencies.
- Historical MongoDB data structures.

It should not be upgraded in place and immediately treated as production-ready financial software. A safer direction is to preserve the legacy application as a reference while building a secure modular application around explicit domains such as:

- Identity and access management.
- Customer profiles and compliance.
- Accounts and currencies.
- Immutable financial ledger.
- Deposits.
- Withdrawals.
- Trader profiles.
- Trader subscriptions and copy relationships.
- Trading signals and execution integrations.
- Administration and role-based permissions.
- Notifications.
- Support.
- Audit and reconciliation.

The simplest sufficient target topology is initially a **modular monolith**, not microservices. Financial consistency, auditability, and operational simplicity are more important than adding distributed-system complexity prematurely.

Before any database migration or major rewrite, the existing MongoDB data must be exported, backed up, and reconciled—especially:

- Users.
- Bcrypt password hashes.
- Currency balances.
- Wallet mappings.
- Payment records.
- Withdrawal and request records.
- Administrator accounts.

No destructive migration should be performed until the backup is independently verified and record counts, balances, hashes, and mappings are reconciled with 100% fidelity.

## 12. Important Source Files

- `server.js` — Express entry point and MongoDB connection.
- `package.json` — runtime declarations and dependencies.
- `routes/routes.js` — user routes.
- `routes/router.js` — admin routes.
- `controller/controller.js` — user, admin, authentication, and finance behavior.
- `controller/homeController.js` — homepage trader loading.
- `isAuth/auth.js` — JWT middleware.
- `model/` — Mongoose data models.
- `views/` — active EJS public, user, and admin templates.
- `public/` — active static CSS, JavaScript, fonts, and images.
- `scrape.py` — evidence of the original public-site scraping/import process.
- `memory.md` — persistent project history, database notes, and earlier modernization analysis.
- `Agents.md` — project-specific safety and collaboration instructions.

## Audit Boundary

This report was produced from repository contents, Git history, installed-package metadata, and static syntax checks. The audit did not:

- Start the application server.
- Connect to MongoDB Atlas.
- Read or modify user records.
- Change environment variables.
- Rotate secrets.
- Install or update dependencies.
- Perform a live penetration test.
- Implement modernization work.

