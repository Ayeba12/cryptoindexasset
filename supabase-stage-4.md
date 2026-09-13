# Supabase Integration: Stage 4

## Goal
Persist trading signals in PostgreSQL via Prisma with timeframe expiration and author audit trails, connect admin creation and visibility controls to live database actions, and deliver the customer signals feed with entitlement gating (funded/allocated accounts only) and active/history tabs.

## Tasks
- [x] Task 1: Extend `prisma/schema.prisma` with `TradingSignal` model and generate fresh migration `20260912_trading_signals` → Verify: `npx prisma validate` & `npx prisma generate`
- [x] Task 2: Implement server actions (`getAdminSignalsAction`, `createSignalAction`, `toggleSignalVisibilityAction`, `withdrawSignalAction`) in `lib/admin/signals.server.ts` → Verify: TypeScript check passes
- [x] Task 3: Connect admin signals UI in `components/admin/signal-create.tsx`, `components/admin/operations.tsx`, and `app/(admin)/layout.tsx` to live database mutations → Verify: Admin UI creates and toggles signals live
- [x] Task 4: Connect customer signals feed in `lib/dashboard/adapters/live.ts` (`getSignals()`) with wallet/allocation entitlement check and signal mapping → Verify: Live adapter returns signals feed
- [x] Task 5: Enhance customer signals UI in `components/dashboard/views/trading.tsx` with Active and Expired/History tabs → Verify: Customer view displays active and historical signals cleanly
- [x] Task 6: End-to-end verification and production build → Verify: `npx tsc --noEmit` and `npm run build`

## Done When
- [x] `TradingSignal` model is persisted in PostgreSQL with versioning and audit logs.
- [x] Admins can create hidden signals and publish them after review.
- [x] Unfunded customers see the entitlement requirement, while funded/allocated customers see live signals.
- [x] Active unexpired signals and historical/expired signals are neatly separated into tabs.
