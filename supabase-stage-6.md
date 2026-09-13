# Supabase Integration: Stage 6

## Goal
Build immutable financial accounting, double-entry ledger entries, balance reservations, administrative deposit/withdrawal review workflows, and copy allocation capital holds across customer and administrative portals.

## Tasks
- [x] Task 1: Update database schema (`prisma/schema.prisma`) with `reserved` balance, idempotency keys, destination addresses, and `LedgerEntry` model → Verify: `npx prisma validate` and client generation pass
- [x] Task 2: Create SQL migration script (`prisma/migrations/20260912_financial_ledger/migration.sql`) for ledger entries, reserved balances, and RLS policies → Verify: Valid SQL syntax
- [x] Task 3: Implement admin financial server actions (`lib/admin/financials.server.ts`) for deposit verification/crediting and withdrawal settlement/hold release → Verify: Server actions compile cleanly
- [x] Task 4: Implement customer financial mutations in `lib/dashboard/mutations.server.ts` (quote/submit/cancel withdrawals and copy start/pause/resume/stop) and update `mappers.ts` → Verify: Atomic reservation holds and ledger entries
- [x] Task 5: Enable live capabilities in `lib/dashboard/adapters/live.ts` and update `mapWallets` to reflect live available/reserved balances → Verify: Customer balances calculate `balance - reserved`
- [x] Task 6: Connect `RequestQueue` in `components/admin/operations.tsx` to live financial server actions with verified credited amount inputs and settlement modals → Verify: Admin queue loads and reviews real transactions
- [x] Task 7: Run end-to-end verification and production build (`npx tsc --noEmit` and `npm run build`) → Verify: Zero errors and all pages compile cleanly

## Done When
- [x] Customer available balance is strictly calculated as `balance - reserved`.
- [x] Withdrawals and copy trade allocations hold funds atomically in `reserved`, preventing race conditions and overspending.
- [x] Admin reviews deposit proofs, confirms exact on-chain credited amounts, and credits wallet balances with immutable `CREDIT` ledger entries.
- [x] Admin settles approved withdrawals (burning hold and debiting balance) or declines them (releasing hold back to available balance).
- [x] Users can cancel pending withdrawals before review, cleanly releasing held funds.
- [x] Stopping copy allocations releases held USDT capital back to available balance.
