-- Stage 6: Financial Accounting, Wallet Reservations & Immutable Ledger Entries

-- 1. Add reserved balance to wallets
ALTER TABLE "wallets" 
ADD COLUMN IF NOT EXISTS "reserved" DECIMAL(18, 8) NOT NULL DEFAULT 0.00000000;

-- 2. Add idempotency_key and destination_address to transactions
ALTER TABLE "transactions" 
ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT UNIQUE;

ALTER TABLE "transactions" 
ADD COLUMN IF NOT EXISTS "destination_address" TEXT;

-- 3. Create LedgerEntryType enum
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LedgerEntryType') THEN 
    CREATE TYPE "LedgerEntryType" AS ENUM ('CREDIT', 'DEBIT', 'HOLD', 'RELEASE'); 
  END IF; 
END $$;

-- 4. Create ledger_entries table
CREATE TABLE IF NOT EXISTS "ledger_entries" (
    "id" TEXT PRIMARY KEY,
    "wallet_id" TEXT NOT NULL REFERENCES "wallets"("id") ON DELETE CASCADE,
    "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "transaction_id" TEXT,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(18, 8) NOT NULL,
    "balance_before" DECIMAL(18, 8) NOT NULL,
    "balance_after" DECIMAL(18, 8) NOT NULL,
    "reserved_before" DECIMAL(18, 8) NOT NULL,
    "reserved_after" DECIMAL(18, 8) NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT,
    "actor" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Indexes for fast lookup and balance auditing
CREATE INDEX IF NOT EXISTS "idx_ledger_entries_user_currency" ON "ledger_entries"("user_id", "currency");
CREATE INDEX IF NOT EXISTS "idx_ledger_entries_wallet" ON "ledger_entries"("wallet_id");

-- 6. Row Level Security for ledger_entries
ALTER TABLE "ledger_entries" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ledger entries"
ON "ledger_entries" FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT id FROM users WHERE supabase_uid = auth.uid()::text
  )
);

CREATE POLICY "Service role full access to ledger entries"
ON "ledger_entries" FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
