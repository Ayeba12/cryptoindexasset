# Supabase Integration: Stage 5

## Goal
Implement storage and evidence workflows for public trader portraits, private KYC identity documents, and private transaction deposit proofs across admin and customer portals, with strict security, short-lived signed URLs, and graceful hybrid fallbacks.

## Tasks
- [x] Task 1: Create storage service module (`lib/storage/supabase-storage.server.ts`) with bucket constants, MIME/size validation, versioned public portrait uploads, private KYC/proof uploads, and 15-minute signed URL generator → Verify: Type check passes
- [x] Task 2: Create storage buckets and RLS migration script (`prisma/migrations/20260912_storage_setup/migration.sql`) → Verify: Valid SQL syntax
- [x] Task 3: Implement admin verification server actions (`lib/admin/verification.server.ts`) with queue retrieval, signed URL generator, review decisions, notifications, and audit logging → Verify: Server actions compile cleanly
- [x] Task 4: Connect trader portrait storage upload in `lib/admin/traders.server.ts` with cache-busting versioned keys → Verify: Trader saves persist public storage URLs
- [x] Task 5: Implement customer KYC and deposit proof mutations in `lib/dashboard/mutations.server.ts` and update `lib/dashboard/adapters/live.ts` capabilities and queries → Verify: Customer uploads create database records
- [x] Task 6: Connect admin `VerificationQueue` in `components/admin/operations.tsx` with signed document preview and review decisions → Verify: Admin queue loads real records with signed URLs
- [x] Task 7: Run end-to-end verification and production build (`npx tsc --noEmit` and `npm run build`) → Verify: Zero errors and all pages compile

## Done When
- [x] Public trader portraits are version-stamped and hosted with cache-busting keys.
- [x] Customer KYC documents and deposit proofs are saved to private buckets with zero public URL exposure.
- [x] Administrators can inspect private documents via 15-minute signed URLs in the review dialog.
- [x] All operations have Graceful Hybrid fallback for local and offline testing.
