# Trader publication sync

## Operator workflow

Open `/admin/traders`, add or edit a trader, and save the profile. The homepage card uses the saved display name, Strategy field, and profile picture. The short summary remains separate profile information.

To appear on the homepage, a trader must be Published, active, and marked **Feature on the public homepage**. Up to eight profiles appear, ordered by featured order, copier count, then name. Saving published edits invalidates the homepage and trader discovery pages. Unpublishing or archiving removes the card on the next page load.

Choose PNG, JPEG, or WebP portraits up to 2 MB. Save the profile after selecting a picture. The request limit allows for base64 encoding overhead. Missing or failed image URLs display the trader's initials; replacement image URLs retry normally. Upload validation failures prevent the profile save.

Design-preview changes remain in browser memory and never call live trader mutations. Live trader pages explicitly use live routing. Saving twice from the new-trader page updates the first saved record instead of creating another.

## Data boundary

Public cards query the same `copyTrader` records as the administrator. Only public card fields are selected. Empty results remain empty; connection errors show a temporary-unavailability message. Neither case inserts fallback names, metrics, portraits, or fake trader IDs.

## Connection status

The configured direct Supabase host resolves only over IPv6 and was unreachable locally. The project's authenticated Connect dialog confirmed its IPv4 session pooler. Local `DATABASE_URL` was changed to that pooler with TLS and a 20-second connection timeout; the existing password was preserved and is never recorded here.

After the operator updated the password, reserved URL characters caused P1013. Encoding the password segment corrected the local connection string. A live read succeeded, and the homepage matched all six published trader names and strategies. All six visible portraits loaded successfully in the browser. No database records, accounts, balances, or schemas were changed during this repair.

## Regression checks

- `node scripts/test-public-trader-sync.mjs`: mapping, publish/active/featured filtering, updates, removals, empty and error responses.
- `node scripts/test-trader-editor-sync.mjs`: published edits, repeat saves, preview isolation, portrait failures and replacement retry.
- `node scripts/test-public-auth-readiness.mjs`: existing auth/public checks.
- `node scripts/test-public-community.mjs http://localhost:3000/`: public rendering, unavailable/empty states, testimonials and marquee controls.
- `node scripts/test-public-pages.mjs http://localhost:3000`: 17 pages and linked scripts.

The changed components passed targeted ESLint checks. The production build and TypeScript checks passed after regenerating a malformed development route-types cache file. Live database reads and homepage rendering are verified. Admin mutation behavior is covered by regression tests; no live profiles were changed for testing.
