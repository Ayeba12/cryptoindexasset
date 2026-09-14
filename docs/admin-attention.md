# Admin review indicators

Admin pages show sidebar badges for pending deposits, withdrawals and submitted KYC documents. A header bell shows the combined count and links to the shared Needs attention panel, which links directly to each queue.

Live counts require admin authentication and query only PENDING transaction/document records. Customers who have not submitted KYC are not counted. Checks run every 30 seconds while the page is visible, on focus/navigation and after review decisions. No documents or customer details are included in count responses. Query failures preserve the previous counts and show an unavailable warning, never a false zero.

Verification: TypeScript and focused lint passed. The regression script `node scripts/test-admin-attention.mjs` covers pending counts, reviewed records, authorization before database access, and failures. Browser preview verified badges and KYC queue navigation. Live database counts could not be verified in this session; no records were changed.
