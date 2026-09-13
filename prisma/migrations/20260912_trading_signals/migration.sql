-- ==========================================================
-- CRYPTOINDEXASSET - TRADING SIGNALS SCHEMA MIGRATION
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.trading_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    asset VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL,
    timeframe VARCHAR(50) NOT NULL,
    analysis TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Draft' NOT NULL,
    enabled BOOLEAN DEFAULT false NOT NULL,
    author TEXT,
    version INT DEFAULT 1 NOT NULL,
    expires_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;

-- 1. Published and enabled signals are readable by authenticated users
CREATE POLICY "trading_signals_select_published" ON public.trading_signals
    FOR SELECT TO authenticated
    USING (status IN ('Published', 'Expired') AND enabled = true);

-- 2. Service role has full access
CREATE POLICY "service_role_all_trading_signals" ON public.trading_signals
    FOR ALL TO service_role
    USING (true);
