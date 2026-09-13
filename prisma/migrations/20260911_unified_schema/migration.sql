-- ==========================================================
-- CRYPTO INDEX ASSET — UNIFIED SCHEMA MIGRATION
-- Aligned with Prisma Client & Full Admin Model Parity
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_KYC');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'PROFIT_ACCRUAL', 'COPY_FEE', 'BONUS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supabase_uid UUID UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    country TEXT,
    role "UserRole" DEFAULT 'USER' NOT NULL,
    status "AccountStatus" DEFAULT 'ACTIVE' NOT NULL,
    two_factor_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. WALLETS TABLE (Multi-Currency Balances)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL,
    balance NUMERIC(18, 8) DEFAULT 0.00000000 NOT NULL,
    locked_profit NUMERIC(18, 8) DEFAULT 0.00000000 NOT NULL,
    total_profit NUMERIC(18, 8) DEFAULT 0.00000000 NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_currency UNIQUE(user_id, currency)
);

-- 4. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type "TransactionType" NOT NULL,
    currency VARCHAR(10) NOT NULL,
    amount NUMERIC(18, 8) NOT NULL,
    fee NUMERIC(18, 8) DEFAULT 0.00000000 NOT NULL,
    status "TxStatus" DEFAULT 'PENDING' NOT NULL,
    tx_hash TEXT,
    payment_proof TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. COPY TRADERS TABLE (Extended Canonical Model)
CREATE TABLE IF NOT EXISTS public.copy_traders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    avatar TEXT,
    avatar_alt TEXT,
    tagline TEXT,
    summary TEXT,
    biography TEXT,
    strategy TEXT,
    strategy_details TEXT,
    assets TEXT,
    experience TEXT,
    holding_period TEXT,
    win_rate NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    profit_share NUMERIC(5, 2) DEFAULT 15.00 NOT NULL,
    accuracy NUMERIC(5, 2),
    period TEXT,
    sample_size TEXT,
    metric_source TEXT,
    risk_level "RiskLevel" DEFAULT 'MEDIUM' NOT NULL,
    risk_method TEXT,
    returns NUMERIC(8, 2),
    drawdown NUMERIC(5, 2),
    rating NUMERIC(3, 2),
    rating_count INT DEFAULT 0 NOT NULL,
    community_source TEXT,
    min_capital NUMERIC(18, 2) DEFAULT 100.00 NOT NULL,
    currency VARCHAR(10) DEFAULT 'USDT' NOT NULL,
    fee NUMERIC(5, 2),
    mode TEXT,
    eligibility TEXT,
    status VARCHAR(20) DEFAULT 'Draft' NOT NULL,
    featured BOOLEAN DEFAULT FALSE NOT NULL,
    featured_order INT,
    version INT DEFAULT 1 NOT NULL,
    notes TEXT,
    auto_trade_mode BOOLEAN DEFAULT TRUE NOT NULL,
    daily_roi_min NUMERIC(5, 2) DEFAULT 1.50 NOT NULL,
    daily_roi_max NUMERIC(5, 2) DEFAULT 4.20 NOT NULL,
    total_followers INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. USER COPY TRADES (Allocations)
CREATE TABLE IF NOT EXISTS public.user_copy_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trader_id UUID NOT NULL REFERENCES public.copy_traders(id) ON DELETE CASCADE,
    allocated_usd NUMERIC(18, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    total_earned NUMERIC(18, 8) DEFAULT 0.00000000 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_trader UNIQUE(user_id, trader_id)
);

-- 7. KYC DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.kyc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    front_url TEXT NOT NULL,
    back_url TEXT,
    status "TxStatus" DEFAULT 'PENDING' NOT NULL,
    rejection_msg TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    reason TEXT,
    before JSONB,
    after JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_traders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_copy_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Users can view and update their own profile
CREATE POLICY "users_select_own_profile" ON public.users
    FOR SELECT TO authenticated
    USING ((select auth.uid()) = supabase_uid);

CREATE POLICY "users_update_own_profile" ON public.users
    FOR UPDATE TO authenticated
    USING ((select auth.uid()) = supabase_uid)
    WITH CHECK ((select auth.uid()) = supabase_uid);

-- 2. Users can view their own wallets
CREATE POLICY "wallets_select_own" ON public.wallets
    FOR SELECT TO authenticated
    USING (
        user_id IN (SELECT id FROM public.users WHERE supabase_uid = (select auth.uid()))
    );

-- 3. Users can view their own transactions
CREATE POLICY "transactions_select_own" ON public.transactions
    FOR SELECT TO authenticated
    USING (
        user_id IN (SELECT id FROM public.users WHERE supabase_uid = (select auth.uid()))
    );

-- 4. Copy traders viewable: published profiles to all authenticated + anon
CREATE POLICY "copy_traders_select_published" ON public.copy_traders
    FOR SELECT TO anon, authenticated
    USING (status = 'Published' AND is_active = true);

-- 5. Users can view and create their own copy-trade allocations
CREATE POLICY "user_copy_trades_select_own" ON public.user_copy_trades
    FOR SELECT TO authenticated
    USING (
        user_id IN (SELECT id FROM public.users WHERE supabase_uid = (select auth.uid()))
    );

-- 6. Notifications for user
CREATE POLICY "notifications_select_own" ON public.notifications
    FOR SELECT TO authenticated
    USING (
        user_id IN (SELECT id FROM public.users WHERE supabase_uid = (select auth.uid()))
    );

-- 7. Service role full access for server-side Prisma operations
CREATE POLICY "service_role_all_users" ON public.users FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_wallets" ON public.wallets FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_transactions" ON public.transactions FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_copy_traders" ON public.copy_traders FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_user_copy_trades" ON public.user_copy_trades FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_kyc" ON public.kyc_documents FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_notifications" ON public.notifications FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_settings" ON public.system_settings FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_audit_logs" ON public.audit_logs FOR ALL TO service_role USING (true);

-- ==========================================================
-- AUTOMATIC NEW USER INITIALIZATION TRIGGER
-- (BTC, ETH, BCH, LTC, XRP, USDT, USD)
-- ==========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_user_id UUID;
BEGIN
    INSERT INTO public.users (supabase_uid, email, full_name, role, status)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Client Investor'),
        'USER',
        'ACTIVE'
    )
    RETURNING id INTO new_user_id;

    INSERT INTO public.wallets (user_id, currency, balance, total_profit)
    VALUES
        (new_user_id, 'BTC', 0.00000000, 0.00000000),
        (new_user_id, 'ETH', 0.00000000, 0.00000000),
        (new_user_id, 'BCH', 0.00000000, 0.00000000),
        (new_user_id, 'LTC', 0.00000000, 0.00000000),
        (new_user_id, 'XRP', 0.00000000, 0.00000000),
        (new_user_id, 'USDT', 0.00000000, 0.00000000),
        (new_user_id, 'USD', 0.00000000, 0.00000000);

    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
        new_user_id,
        'Welcome to Crypto Index Asset',
        'Your multi-currency portfolio wallets have been generated. Deposit crypto or USD to begin copy-trading top institutional managers.'
    );

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
