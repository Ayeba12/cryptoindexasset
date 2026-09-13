# MEMORY.md — Project State & Context Record

> **Purpose:** Persistent memory log for the Crypto Index Asset platform to preserve context across AI sessions and development milestones.

---

## 📌 1. Project Identity & Architecture
- **Repository:** `cryptoindexasset`
- **Application Type:** Multi-tiered Cryptocurrency Copy-Trading & Investment Management SaaS Platform.
- **Key Modules:**
  1. **Marketing Frontend (`/`, `/about`, `/investors`, `/contact`, `/terms`, `/policy`):** Public-facing pages with copy-trading showcases, trading packages, and live crypto tickers.
  2. **Client Portal (`/user/dashboard`, `/user/address`, `/user/withdraw`, `/user/profile`):** User dashboard handling balances across cryptos (BTC, ETH, USDT, etc.), deposit address retrieval, withdrawal request submissions (wallet/bank), and 2FA toggles.
  3. **Administrative Back-Office (`/panel/admin/*`):** Admin dashboard, user moderation (block/unblock/edit), manual financial crediting/debiting, deposit approvals, withdrawal request processing, top copy-trader management, and deposit wallet configuration.

---

## 🗄️ 2. Database Audit & User Safety Findings

### Current Database Engine:
- **Database:** MongoDB (Cloud-hosted on MongoDB Atlas).
- **Driver:** Mongoose `^6.0.9`.
- **Mongoose Models:**
  - `User`: Handles credentials (`name`, `email`, `number`, `password` bcrypt hashed), `blocked`, `twoFA`, `status`.
  - `Finance`: Tracks financial balances and request counts.
  - `Currency`: Tracks multi-currency balances per user.
  - `Paid`: Records approved payment history.
  - `Withdrawal`: Stores pending and completed withdrawal entries.
  - `Request`: Tracks pending payout requests (wallet / bank wire).
  - `Wallet`: Configurable admin deposit addresses.
  - `Traders`: Copy-trading profiles with win rates, profits, and avatars.
  - `Admin`: Back-office administrator accounts.
  - `LastLogin`: Token and session audit log.

### ⚠️ Current MongoDB Atlas Connection Status & User Preservation:
- The connection strings in `.env` point to MongoDB Atlas (`cluster0.mwunj.mongodb.net`).
- **Audit Result:** Connection attempts returned: `Could not connect to any servers in your MongoDB Atlas cluster (IP Whitelist check required)`.
- **User Safety Guarantee:**
  - **The user data is NOT in local files; it is stored safely in MongoDB Atlas.**
  - **Action Required to Access Users:**
    1. Log into [cloud.mongodb.com](https://cloud.mongodb.com).
    2. Go to **Network Access** > **IP Access List**.
    3. Add `0.0.0.0/0` (Allow Access from Anywhere) or whitelist the current IP.
    4. Export existing users immediately via `mongoexport` or a Node script to save an offline JSON backup before making any structural changes.

---

## 🔄 3. Database Migration: MongoDB to Supabase (PostgreSQL)

Can we use **Supabase**? **YES, absolutely.**
Supabase provides:
- High-performance PostgreSQL database.
- Built-in Authentication & Row Level Security (RLS).
- Realtime balance and trade updates via WebSockets.
- Built-in Storage for identity verification (KYC) or payment proof screenshots.

### Relational Schema Mapping for Supabase:
```sql
-- 1. Profiles / Users Table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    is_blocked BOOLEAN DEFAULT false,
    two_fa_enabled BOOLEAN DEFAULT false,
    show_signal BOOLEAN DEFAULT true,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Account Balances Table (Multi-currency)
CREATE TABLE user_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    currency_code TEXT NOT NULL, -- 'BTC', 'ETH', 'USDT', 'USD'
    available_balance NUMERIC(18, 8) DEFAULT 0.0,
    locked_balance NUMERIC(18, 8) DEFAULT 0.0,
    total_earned NUMERIC(18, 8) DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, currency_code)
);

-- 3. Deposits & Withdrawals (Transactions)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    transaction_type TEXT CHECK (transaction_type IN ('deposit', 'withdrawal', 'profit_credit', 'debit')),
    amount NUMERIC(18, 8) NOT NULL,
    currency_code TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
    destination_type TEXT, -- 'wallet', 'bank'
    destination_address TEXT,
    bank_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Copy Traders Table
CREATE TABLE copy_traders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    avatar_url TEXT,
    win_rate NUMERIC(5, 2) DEFAULT 95.0,
    total_profit_rate NUMERIC(6, 2) DEFAULT 120.0,
    followers_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);
```

---

## 🌐 4. Hosting Analysis: Hostinger vs Vercel

| Criteria | Hostinger (VPS Hosting) | Vercel (Edge / Serverless) |
| :--- | :--- | :--- |
| **Best Used For** | Traditional Node.js / Express.js / PM2 / Nginx & existing legacy EJS backend. | Modern Next.js, React, Tailwind, Supabase SaaS applications. |
| **Hostinger Recommended Plan** | **Hostinger KVM 1 or KVM 2 VPS** (Ubuntu LTS + Node.js + PM2). Cost-effective, dedicated resources, full root control. | Free Hobby / $20 Pro plan. |
| **Deployment Flow** | Git pull -> `pm2 restart server` or automated CI/CD webhook. | Git push -> Automatic preview & production builds, edge distribution. |
| **Speed & Performance** | Depends on VPS location and resource specs. | Ultra-fast global CDN, instant image optimization, serverless edge scaling. |
| **Maintenance** | Requires OS updates, firewall management, SSL cert renewals (Certbot). | Zero server maintenance, automated SSL, automated rollback. |
| **Verdict** | **Choose Hostinger VPS** if you want to deploy the *current* Express/EJS app without rewriting code.<br>**Choose Vercel** if we modernize the app to Next.js + Supabase. |

---

## 🏆 5. Recommended Modern Stack (Gold Standard)
1. **Frontend & Backend:** **Next.js 14/15** (App Router, Server Actions, API Routes, SSR/SSG).
2. **UI & Design:** **Tailwind CSS v4** + **shadcn/ui** + **Lucide Icons** + **Framer Motion** for a luxurious, high-converting trading terminal aesthetic (dark theme, glassmorphism, animated candlestick charts).
3. **Database & Auth:** **Supabase** (PostgreSQL + Auth + Realtime + Storage).
4. **Data Visualizations:** **TradingView Advanced Charting Widget** + Live WebSockets for real-time crypto prices.
5. **Hosting:** **Vercel** (Frontend/API) + **Supabase** (Database/Auth).

---

## 📝 6. Action History & Progress Log
- **2026-09-13:**
  - Fixed public trader sync: homepage uses published/active/featured admin records and the Strategy field; removed invented database-error fallbacks. Fixed live-admin routing, published edits, duplicate saves on the new-trader page, and failed portrait rendering. See `docs/trader-publication-sync.md`.
  - Verified Supabase's IPv4 session pooler and updated the local connection address. After the operator supplied the current password, encoded reserved password characters to fix P1013. Live reads now succeed; all six published names, strategies, and portraits were verified on the homepage. No database records or schemas changed.
  - Upgraded the modern application to Next.js 16.3.5 and React 19.3.0. Migrated the root middleware to `proxy.ts` and updated cache invalidation calls.
  - Fixed the animation stylesheet import that caused Turbopack compilation failures and HTTP 500 responses; restarted the local development server.
  - Production build, TypeScript, development/production public-page smoke tests, and routing regression checks passed. Live database access remains unavailable; existing lint and dashboard test-loader issues remain. See `docs/next-upgrade-2026-09-13.md` for evidence and limits.
- **2026-08-31:**
  - Audited full repository codebase, controllers, models, and routes.
  - Tested MongoDB Atlas connectivity; identified IP whitelist restriction.
  - Verified user data safety guidelines to prevent data loss.
  - Formulated Supabase migration schema & Hostinger vs Vercel comparison.
  - Updated `Agents.md` and created `memory.md` to persist project knowledge.
