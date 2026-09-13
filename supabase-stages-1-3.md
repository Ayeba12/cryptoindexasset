# Supabase Integration: Stages 1–3

## Goal
Establish schema parity with fresh migration generation, enforce secure identity mapping, and unify the trader publication lifecycle across public site, customer dashboard, and admin portal with immediate liquidation / auto-close for archived trader allocations.

## Tasks
- [x] Task 1: Reconcile `prisma/schema.prisma` with `@map` attributes, extend `CopyTrader` model with canonical admin fields and `AuditLog` model → Verify: `npx prisma validate`
- [x] Task 2: Generate fresh unified SQL migration for PostgreSQL/Supabase and run `npx prisma generate` → Verify: Prisma client generated without errors
- [x] Task 3: Implement server-side admin trader mutation actions (`getAdminTraders`, `createTrader`, `updateTrader`, `publishTrader`, `unpublishTrader`, `archiveTrader`) in `lib/admin/traders.server.ts` with atomic auto-liquidation of allocations on archive → Verify: TypeScript check passes
- [x] Task 4: Connect `app/(admin)/layout.tsx` and `components/admin/provider.tsx` to live trader state and mutations → Verify: Admin UI dispatches real DB actions
- [x] Task 5: Update `lib/dashboard/adapters/live.ts` trader queries to filter by published status and map canonical fields → Verify: Customer copy-trading directory reflects live published data
- [x] Task 6: Connect `TopTradersSection` in `components/public-site/community.tsx` to read live published featured traders from the database with demo fallback → Verify: Homepage displays live published featured traders
- [x] Task 7: End-to-end verification and type checking → Verify: `npx tsc --noEmit` and `npm run build`

## Done When
- [x] Prisma schema has 100% parity with PostgreSQL snake_case columns.
- [x] Admin dashboard can create, update, publish, unpublish, and archive trader profiles with optimistic concurrency.
- [x] Archiving a trader hides them from discovery and safely executes auto-liquidation of customer copy allocations back to their USDT wallet.
- [x] Both public homepage and customer dashboard consume the published trader directory from the database.
