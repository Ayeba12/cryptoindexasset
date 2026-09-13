# AGENTS.md — Crypto Index Asset (Trading & Investment Platform)

## 📌 Project Overview
- **Project Name:** Crypto Index Asset (`cryptoindexasset` / `coddle`)
- **Type:** Cryptocurrency Copy-Trading, Investment & Asset Management SaaS Platform
- **Core Functionality:**
  - **Public Portal:** High-converting landing pages, market tickers, investment tier calculators, copy-trading showcases, testimonials.
  - **User Dashboard:** Multi-currency balance tracking (BTC, ETH, USDT, etc.), automated profit accruals, deposit flows with QR/wallet addresses, withdrawal requests (crypto wallet & bank wires), 2FA security, signal tracking.
  - **Admin Control Panel:** Complete back-office to credit/debit balances, approve/reject deposits & withdrawals, manage wallet addresses, manage copy traders, block/suspend users, and dispatch notifications.
- **Current Target Audience:** Retail crypto investors, copy-trading clients, and financial portfolio managers.

---

## 🛠️ Current Tech Stack & Architecture
- **Backend Runtime:** Node.js (v16+ / v18+ LTS recommended; legacy: v15.x)
- **Framework:** Express.js `4.17.1`
- **Template Engine & UI:** EJS (Embedded JavaScript) + Vanilla CSS/Bootstrap + Chart Widgets (TradingView)
- **Database & ODM:** MongoDB Atlas via Mongoose `^6.0.9`
- **Authentication & Security:** JWT (`jsonwebtoken`), `bcryptjs`, HttpOnly Cookies (`cookie-parser`), CSRF Protection (`csurf`), SSL Enforcer (`express-sslify`)
- **File Handling:** `multer`

---

## 🚀 Modernization Target Stack (Next Generation)
- **Frontend / Framework:** Next.js 14/15 (App Router, Server Components) / Vite + React 18+
- **Styling & UI:** Tailwind CSS v4, Radix UI / shadcn/ui, Lucide Icons, Framer Motion
- **Charts / Market Data:** TradingView Advanced Real-time Charts, CoinGecko/Binance WebSockets
- **Database:** Supabase (Managed PostgreSQL) with Row-Level Security (RLS) & Realtime
- **ORM / Migrations:** Drizzle ORM or Prisma ORM
- **Deployment Platform:** Vercel (Edge/Serverless for Next.js) or Hostinger VPS (KVM 1/2 with Nginx + PM2 for Express)

---

## 📋 Essential Development Commands

### Current Express.js Engine
- **Install Dependencies:** `npm install`
- **Start Dev Server:** `npm start` or `node server.js` (runs on PORT 5000 / 3000)
- **Environment Setup:** Ensure `.env` is populated with `PORT`, `DB_URI`, `SECRET_ACCESS_TOKEN`.

---

## 🛡️ Critical Agent Guidelines & Rules

### 1. Database & User Safety (P0 - Zero Data Loss)
- **NEVER** drop, purge, or overwrite collections/tables.
- **NEVER** run destructive migration scripts without taking an offline `.json` or `.csv` snapshot of user balances, credentials, and transaction logs.
- When migrating to Supabase or new DB clusters, verify that user password hashes (bcrypt) and wallet mappings transfer with 100% fidelity.

### 2. Security & Financial Integrity
- Keep all administrative actions behind strict role-based authentication (`checkUser` / admin JWT token).
- Validate all credit/debit adjustments on the backend; never trust client-side amounts.
- Ensure cryptographic salts and JWT secrets are kept exclusively in `.env` and never committed to Git.
- Whitelist IP addresses on MongoDB Atlas / Supabase database connections.

### 3. Code Quality & Standards
- Self-documenting code with clear error boundaries.
- No silent catch blocks (always log or handle errors with appropriate HTTP status codes).
- Use proper HTTP status codes (`200`, `400`, `401`, `403`, `500`).
- Responsive design: All dashboard components must render seamlessly on mobile, tablet, and ultra-wide displays.

### 4. Response & Collaboration Style
- Keep responses concise, direct, and professional.
- Prioritize high-value solutions, security audits, and production-ready code.
- Always cross-reference `memory.md` before initiating major refactors.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
