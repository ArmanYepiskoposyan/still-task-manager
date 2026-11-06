# Deployment preparation — no deployment performed

## Recommendation and configuration

**Vercel is the recommended provider**, matching the owner's preference. Still is a static Vite application with no backend, environment secrets or server-side rendering. Vercel documents [Vite support](https://vercel.com/docs/frameworks/frontend/vite), [static configuration](https://vercel.com/docs/project-configuration/vercel-json), [Node 24 support](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) and [rollback](https://vercel.com/docs/instant-rollback). There is no identified technical reason to switch to Netlify for this application. No hosting account/project was created or connected.

`vercel.json` sets framework `vite`, install `npm ci`, build `npm run build`, and output directory `dist`. Use repository root as Root Directory and Node 24.x in provider settings; `.nvmrc` records exact local Node 24.22.1. Provider patch/npm selection must be checked in its build log; local verification used npm 12.2.0. No environment variables, functions, backend, analytics or seed data are needed.

The workflow does not deploy. Do not connect a Git integration or run a Vercel deployment command during preparation: importing a repository can create a deployment immediately.

## Verified local serving behavior

`npm run build` emits static HTML, JS, CSS, two DM Sans WOFF2 files, favicon, theme bootstrap and license notices. Assets use relative paths. `npm run test:release` serves the actual output with ordinary static-file semantics at root and `/java-task-manager/`, exercising all three engines, loaded fonts, task/project creation, theme and data reload, JSON download, no horizontal overflow, and absence of external requests/page errors.

Navigation uses in-page state; no client route such as `/today` exists, and no catch-all rewrite is needed. Refresh reloads the app at the root and resets the selected view while preserving saved data/theme. Unknown paths need not expose development files. Production output excludes source maps, tests and package configuration. The theme bootstrap executes before React to apply the stored/system theme. Fresh browser origins start empty.

**NOT VERIFIED:** a provider build, publicly served HTTPS, DNS/certificate, CDN caching and actual Vercel headers. Local HTTP loopback testing verifies production files, not a deployed hosting platform. No mixed-content application resources or external APIs were found; `crypto.randomUUID` expects a secure context, which an HTTPS deployment provides.

## Storage and origin changes

localStorage belongs to an exact origin (scheme, hostname, port) and browser profile. The deployed site, localhost, `127.0.0.1`, different preview ports, preview deployment hostnames and a later custom domain have separate workspaces. Data does not transfer automatically. Export a backup from the old origin and explicitly import it into the desired origin. Keep the old copy until the new workspace and backup are verified. Deployment and rollback never access a user's local task data.

Use the same stable production origin after launch. There is no cloud backup, encryption or cross-device synchronization. Hosting supplies the static application, not task storage.

## Procedure after explicit publication/deployment authorization

1. Complete the [release checklist](release-checklist.md), inspect the existing remote again, and publish the reviewed source using the safe [repository plan](phase6-repository.md). Confirm the exact CV URL and CI outcome.
2. With deployment authorization, import only `ArmanYepiskoposyan/java-task-manager` into Vercel. Review the root, Node 24, install/build/output values above before initiating deployment. Do not add a backend, secrets, tracking or synthetic seed tasks.
3. Inspect the hosted build log and asset requests. Confirm HTTPS, cold load, font/theme loading, refresh, all navigation, mobile reflow, keyboard workflow, task/project CRUD, JSON export/import, error-free console and origin-specific persistence in a disposable synthetic workspace.
4. Check desktop light/dark, tablet, mobile and 320px layouts. Run screen-reader and actual 200%/400% zoom checks on available browsers. Verify no development endpoints or source maps are served.
5. Record the deployed source commit and deployment identifier. Add the verified live URL to the README only after owner acceptance; retain the existing repository URL.

## Rollback

Before a release, retain a known-good deployment and its matching source commit. Use Vercel's documented Instant Rollback control to select that verified deployment, then repeat HTTPS, asset, theme, navigation and persistence smoke checks. If no previous deployment exists, withdraw or disable the faulty release through provider controls and fix forward; there is no initial-release rollback target yet.

Only roll back to a build compatible with the current schema-2 workspace. A schema-1-only historical build cannot safely read current project data. Export a backup before any manual data conversion, and never silently downgrade or replace user storage. Code rollback does not restore deleted tasks or import history. If a code correction is needed in Git, use a new revert/fix commit, not history rewriting or force-push. Recheck provider production-branch/automatic-deployment state after rollback. **NOT VERIFIED:** no actual rollback or hosted deployment has been performed.
