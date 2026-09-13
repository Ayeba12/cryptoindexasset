# Next.js upgrade and local server repair

Verified on 13 September 2026.

## Changes

- Upgraded Next.js to 16.3.5, the npm `latest` stable release at verification time, with React and React DOM 19.3.0 and matching React types.
- Renamed the root request handler from `middleware.ts` to `proxy.ts`, preserving public routes and customer/admin access checks. Updated the routing regression test.
- Preserved immediate tag invalidation using the Next.js 16 two-argument `revalidateTag` API.
- Fixed the global animation stylesheet import. Turbopack failed to resolve the package's style-only export and returned HTTP 500 across pages. Importing the installed CSS file directly resolved the compilation error.
- Replaced the removed `next lint` command with ESLint CLI configuration and added `npm run typecheck`.
- Kept ESLint at 9.39.5 because the React plugin bundled with `eslint-config-next` fails under ESLint 10.10.0. npm marks ESLint 9 deprecated; revisit when the plugin supports ESLint 10.
- Next.js updated the TypeScript JSX setting and generated-type paths, and appended its version-matched documentation guidance to `Agents.md`.

## Verification

- Production build, including TypeScript and static generation: passed. Used `CA_ISOLATED_BUILD=1` to avoid interfering with the development server.
- Standalone `npm run typecheck`: passed after the React type updates. Package and lockfile dependency declarations match.
- Public smoke test: passed against both development and production servers. Covers 17 pages, 358 internal links, metadata, images, and page script delivery.
- Production access checks: customer/admin pages redirect to their respective login pages; dashboard/admin design previews return 404.
- Browser checks: login renders, password visibility toggles, and the dashboard preview finishes rendering its fixture balances, activity and charts without an error overlay.
- Public routing, account routing, money arithmetic, ownership, and public-auth-readiness regression scripts: passed.

## Remaining verification limits

- The configured hosted database was unreachable during the build. Authenticated live account and financial operations were not verified. No database migrations or account mutations were performed.
- The existing dashboard screen test loader rejects the `@/lib/content/approved-people` import alias before its assertions run.
- The newly enabled lint rules report existing component issues. The first run reported 16 errors and 13 warnings; lint cleanliness is not claimed.

## References

- https://nextjs.org/docs/app/guides/upgrading/version-16
- Version-matched guide: `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`
