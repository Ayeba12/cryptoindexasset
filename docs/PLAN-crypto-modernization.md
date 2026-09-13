# PROJECT PLAN: Crypto Index Asset Modernization (Enterprise Architecture)

**Document ID:** `docs/PLAN-crypto-modernization.md`  
**Target Stack:** Next.js 15 (App Router) + Prisma ORM + Supabase (Auth/Postgres/Storage/Realtime) + Tailwind CSS + shadcn/ui  
**Phased Deployment:** Phase 1 (Vercel + Supabase Cloud) → Phase 2 (Hostinger KVM 2 VPS Migration)

---

## 📌 Executive Summary & Architectural Vision

The goal is to modernize the **Crypto Index Asset** platform from a legacy Express/EJS/Mongoose monolith into an enterprise-grade, cloud-agnostic **Modular Monolith** built on Next.js 15 and PostgreSQL. 

The architecture is explicitly decoupled from vendor-specific proprietary APIs so that the application can be developed and launched instantly on **Vercel + Supabase Cloud**, and later migrated to a **Hostinger KVM 2 VPS (Dockerized Supabase + Node/PM2)** with **zero code modifications**.

---

## 🏛️ System Architecture Blueprint

```
                                [CLIENT TIER]
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ Next.js 15 React 19 Client Components                                   │
   │ • Tailwind CSS + shadcn/ui (Enterprise Dark Trading UI)                 │
   │ • TradingView Real-Time Chart Widgets & Live Coin Tickers               │
   │ • Supabase Realtime Channels (Instant balance & profit push updates)    │
   └────────────────────────────────────┬────────────────────────────────────┘
                                        │
                                [APPLICATION TIER]
   ┌────────────────────────────────────▼────────────────────────────────────┐
   │ Next.js 15 App Router (Standalone Node.js Runtime)                      │
   │                                                                         │
   │ ├── ROUTE GROUPS & PRESENTATION BOUNDARIES:                             │
   │ │   ├── /(marketing)   → Public Landing, Tickers, Calculators, Terms    │
   │ │   ├── /(auth)        → Supabase Auth (Email/Pass, Magic Link, 2FA)    │
   │ │   ├── /(dashboard)   → User Portfolio, Wallets, Copy-Trading, History │
   │ │   └── /(admin)       → Back-Office Suite, Approvals, Credit/Debit     │
   │ │                                                                       │
   │ ├── CORE DOMAIN SERVICES (/lib/services):                               │
   │ │   ├── AuthService       → Session management via @supabase/ssr        │
   │ │   ├── WalletEngine      → Atomic credit/debit, multi-currency balance │
   │ │   ├── TradeAccrualEngine→ Hybrid (Auto-cron schedule + Manual trigger)│
   │ │   ├── TransactionService→ Deposit QR generation & Withdrawal pipeline │
   │ │   └── StorageService    → S3/Supabase Storage for KYC & Receipts      │
   │ │                                                                       │
   │ └── DATA ACCESS LAYER (/lib/db):                                        │
   │     └── Prisma Client (Connection Pooling & Strongly Typed Queries)     │
   └────────────────────────────────────┬────────────────────────────────────┘
                                        │
                                [DATA & STORAGE TIER]
   ┌────────────────────────────────────▼────────────────────────────────────┐
   │ PostgreSQL (Supabase Cloud → Hostinger VPS Self-Hosted)                 │
   │ • Row-Level Security (RLS) on all tables                                │
   │ • Automated WAL / Transaction Logs & Point-in-Time Backups              │
   │ • S3-Compatible Object Storage (KYC ID Cards, Payment Proof Receipts)   │
   └─────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database & Domain Data Model (Prisma Schema Design)

```prisma
// High-Level Domain Model Breakdown

model User {
  id            String         @id @default(uuid())
  supabaseUid   String         @unique // Maps to auth.users.id
  email         String         @unique
  fullName      String?
  role          UserRole       @default(USER) // USER, ADMIN, SUPERADMIN
  status        AccountStatus  @default(ACTIVE) // ACTIVE, SUSPENDED, PENDING_KYC
  twoFactorEnabled Boolean     @default(false)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  wallets       Wallet[]
  transactions  Transaction[]
  copyTrades    UserCopyTrade[]
  kycDocument   KycDocument?
  notifications Notification[]
}

enum UserRole {
  USER
  ADMIN
  SUPERADMIN
}

enum AccountStatus {
  ACTIVE
  SUSPENDED
  PENDING_KYC
}

model Wallet {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  currency    String   // BTC, ETH, USDT, USD
  balance     Decimal  @default(0.00000000) @db.Decimal(18, 8)
  lockedProfit Decimal @default(0.00000000) @db.Decimal(18, 8)
  totalProfit Decimal  @default(0.00000000) @db.Decimal(18, 8)
  address     String?  // Dedicated deposit address
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, currency])
}

model Transaction {
  id            String            @id @default(uuid())
  userId        String
  user          User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  type          TransactionType   // DEPOSIT, WITHDRAWAL, PROFIT_ACCRUAL, BONUS
  currency      String
  amount        Decimal           @db.Decimal(18, 8)
  fee           Decimal           @default(0.00000000) @db.Decimal(18, 8)
  status        TxStatus          @default(PENDING) // PENDING, APPROVED, REJECTED, CANCELLED
  txHash        String?
  paymentProof  String?           // Supabase Storage URL
  notes         String?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
}

enum TransactionType {
  DEPOSIT
  WITHDRAWAL
  PROFIT_ACCRUAL
  COPY_FEE
  BONUS
}

enum TxStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

model CopyTrader {
  id             String          @id @default(uuid())
  name           String
  avatar         String?
  winRate        Decimal         @db.Decimal(5, 2) // e.g. 94.50%
  profitShare    Decimal         @db.Decimal(5, 2) // e.g. 15.00%
  riskLevel      String          // Low, Medium, High
  minCapital     Decimal         @db.Decimal(18, 2)
  autoTradeMode  Boolean         @default(true) // Hybrid toggle: Auto vs Manual
  dailyRoiMin    Decimal         @default(1.50) @db.Decimal(5, 2)
  dailyRoiMax    Decimal         @default(4.20) @db.Decimal(5, 2)
  isActive       Boolean         @default(true)
  createdAt      DateTime        @default(now())

  userFollowers  UserCopyTrade[]
}

model UserCopyTrade {
  id           String     @id @default(uuid())
  userId       String
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  traderId     String
  trader       CopyTrader @relation(fields: [traderId], references: [id], onDelete: Cascade)
  allocatedUsd Decimal    @db.Decimal(18, 2)
  status       String     @default("ACTIVE") // ACTIVE, PAUSED, STOPPED
  totalEarned  Decimal    @default(0.00000000) @db.Decimal(18, 8)
  createdAt    DateTime   @default(now())
}
```

---

## ⚡ Core Engine Design: Hybrid Trade & Profit Accrual System

To satisfy requirement **#2 (both automated schedule and manual admin toggle)**:

1. **Automated Mode (Cron-Driven Engine):**
   * Configurable via Next.js Cron (Vercel Cron in Phase 1 / Linux systemd cron in Phase 2).
   * Calculates random or fixed ROI within `[dailyRoiMin, dailyRoiMax]` for each active copy trader and credits follower wallets automatically.
2. **Manual Mode (Admin Override):**
   * Admin can toggle `autoTradeMode = false` on any trader.
   * Admin can push an **Instant Profit Signal** with custom percentage from the Admin Panel, immediately calculating and crediting all followers.
3. **Atomic Financial Safety:**
   * All balance updates run inside `prisma.$transaction([...])` with strict ACID isolation.

---

## 🗂️ Proposed Clean Folder Architecture

```text
cryptoindexasset/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx            # Public User Login Portal
│   │   ├── register/page.tsx         # Public User Registration Flow
│   │   ├── forgot-password/page.tsx  # User Password Recovery
│   │   └── verify-email/page.tsx     # Email Confirmation Handler
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Authenticated User Shell & Sidebar
│   │   ├── dashboard/page.tsx        # Portfolio, Balances, Live Chart
│   │   ├── deposit/page.tsx          # Dynamic QR & Payment Proof Upload
│   │   ├── withdraw/page.tsx         # Multi-network Withdrawal Wizard
│   │   ├── copy-trading/page.tsx     # Copy-Trader Marketplace & Allocation
│   │   ├── transactions/page.tsx     # Full Activity & Receipt Ledger
│   │   └── settings/page.tsx         # 2FA, Profile, KYC Verification
│   ├── (admin)/
│   │   ├── admin/login/page.tsx      # SEPARATE Dedicated Admin Portal (Isolated Auth)
│   │   ├── layout.tsx                # Strict Admin Role-Gated Shell (SUPERADMIN/ADMIN)
│   │   ├── admin/page.tsx            # Executive Dashboard & System Metrics
│   │   ├── admin/users/page.tsx      # User Directory, Suspend/Activate, Credit/Debit
│   │   ├── admin/deposits/page.tsx   # Pending Deposit Approvals & Receipt Zoom
│   │   ├── admin/withdrawals/page.tsx# Withdrawal Dispatch & TXID Confirmation
│   │   └── admin/traders/page.tsx    # Hybrid Bot Control & Manual Signal Dispatch
│   ├── (marketing)/
│   │   ├── page.tsx                  # High-Converting Hero, Tickers & Copy Showcase
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   └── terms/page.tsx
│   └── api/
│       ├── cron/accrue-profits/route.ts # Automated ROI Calculation Worker
│       └── webhooks/route.ts
├── components/
│   ├── ui/                           # shadcn/ui component library
│   ├── dashboard/                    # BalanceCards, QuickActions, TickerBar
│   ├── charts/                       # TradingView widgets & Recharts
│   └── admin/                        # ApprovalModals, UserEditDrawer
├── lib/
│   ├── db/
│   │   └── prisma.ts                 # Global singleton Prisma client
│   ├── supabase/
│   │   ├── client.ts                 # Browser client (Realtime)
│   │   ├── server.ts                 # Server client (@supabase/ssr)
│   │   └── middleware.ts             # Auth & Role-Based Route Guard
│   └── services/
│       ├── wallet.service.ts
│       ├── trade.service.ts
│       └── storage.service.ts
├── prisma/
│   └── schema.prisma                 # PostgreSQL database definitions
└── package.json
```

---

## 🚀 Execution & Phase Roadmap

### Phase 1: Vercel + Supabase Foundation (Active)
- **Step 1.1:** Initialize Next.js 15 App Router codebase with TypeScript, Tailwind CSS, and shadcn/ui.
- **Step 1.2:** Configure Prisma with PostgreSQL schema and generate client types.
- **Step 1.3:** Configure Supabase Auth helper (`@supabase/ssr`) with RBAC middleware (`/user` vs `/admin`).
- **Step 1.4:** Implement core business services (`wallet.service.ts`, `trade.service.ts`).
- **Step 1.5:** Validate end-to-end flow with automated tests.

### Phase 2: High-End UI & Trading Redesign (Ready for Your Signal)
- **Step 2.1:** High-converting landing page with TradingView tickers and profit calculators.
- **Step 2.2:** User Dashboard (dark crypto terminal theme, real-time balance sync, deposit/withdrawal wizards).
- **Step 2.3:** Admin Control Suite (data tables, 1-click approvals, manual profit trigger).

### Phase 3: Seamless Migration to Hostinger KVM 2 (Future)
- **Step 3.1:** Deploy self-hosted Supabase Docker containers on Ubuntu VPS.
- **Step 3.2:** Run `prisma migrate deploy` against the VPS database.
- **Step 3.3:** Build Next.js in `standalone` mode and launch via PM2 + Nginx SSL.

---

## ✅ Quality & Verification Plan
* **Authentication Security:** Verify unauthenticated and non-admin users cannot access `/admin/*` via Next.js Middleware and Supabase RLS.
* **Financial Integrity:** Unit tests for atomic balance calculations (deposit approvals, withdrawal lockings, and hybrid profit distribution).
* **Realtime Sync:** Verify that balance credits in the admin panel trigger instant UI updates on active user screens.
