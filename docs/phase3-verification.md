# Phase 3 verification

Historical approved Phase 3 record. See the [Phase 4 audit](phase4-audit.md) and [verification](phase4-verification.md) for the subsequent quality review.

Date: 2026-10-27. Scope: daily task organization on the approved Phase 2 foundation. Phase 4, Git initialization, publication and deployment are not performed.

## Environment and reproducible commands

macOS ARM64; Node 24.22.1; npm 12.2.0. Dependencies and lockfile are unchanged. Vite 8.3.4, Vitest 5.0.5 and Playwright 1.64.1 run from the pinned project installation. Full Chromium channel is configured for the existing macOS runtime; Firefox and WebKit are also tested.

```sh
export PATH="$PWD/.tools/bin:$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers"
npm run check
npm run test:e2e
npm run format:check
```

The PATH fallback applies only to this existing machine. On another machine, use compatible Node/npm, `npm ci`, and `npm exec -- playwright install chromium firefox webkit`, then build and run the same scripts. The local browser suite starts a loopback production preview on port 4173. No network service is deployed.

## Final results

| Check                                        | Actual result                                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck` (within `npm run check`) | Passed, zero TypeScript errors                                                                                                                          |
| `npm run lint` (within `npm run check`)      | Passed, zero ESLint warnings/errors                                                                                                                     |
| `npm test` (within `npm run check`)          | 186 passed, eight files, zero failed; 2.46 seconds                                                                                                      |
| `npm run build` (within `npm run check`)     | Passed, 36 modules, 211 ms Vite build                                                                                                                   |
| `npm run test:e2e`                           | 128 passed, four duplicate screenshot-capture skips, zero failed; 2.0 minutes                                                                           |
| Chromium                                     | 44 passed: 42 behavior tests plus two screenshot captures                                                                                               |
| Firefox                                      | 42 behavior tests passed; two duplicate captures skipped                                                                                                |
| WebKit                                       | 42 behavior tests passed; two duplicate captures skipped                                                                                                |
| Axe accessibility                            | 84 scans, zero violations under the configured WCAG A/AA tags                                                                                           |
| Responsive checks                            | 1440, 768, 390, 360, 320px; both themes; all three engines passed                                                                                       |
| Development smoke                            | HTTP 200; StrictMode create, focus/scroll lock and restoration, Today, search/filter/sort without writes, reload persistence; zero uncaught page errors |
| Formatting                                   | Passed: all matched files use Prettier code style                                                                                                       |

The four skips belong only to the Phase 2 and Phase 3 screenshot capture tests on Firefox/WebKit. Both captures run on Chromium; every functional test runs on every engine. Axe totals comprise 48 retained Phase 2 scans and 36 Phase 3 scans (six states × two themes × three engines). Automated tags are `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`.

Final command logs were retained outside the project in `<temporary-log-directory>/still-phase3-check-final.log`, `<temporary-log-directory>/still-phase3-browser-final.log`, and `<temporary-log-directory>/still-phase3-dev-smoke-final.log`. The development script waits for native dialog unmount/React cleanup before asserting restored scrolling; an initial immediate assertion ran before cleanup and was corrected without changing application code.

The production build transforms 36 modules. Output JavaScript is 255.97 kB (79.53 kB gzip), CSS 35.24 kB (8.37 kB gzip), plus locally bundled DM Sans fonts. No new runtime or development dependency was introduced.

## Coverage and architecture verification

The 107 Phase 2 unit/component tests remain, with 79 additional tests for a total of 186 across eight files. New pure selector tests cover incomplete Today/overdue membership, undated/completed exclusion, leap/month/year boundaries, literal Unicode title/notes matching, all individual and combined filters, all sorting rules, deterministic ties, frozen-input immutability and independent workload counts. New component tests cover empty/no-results states, live result counts, clear/reset focus, view intersection, persistent task identity/order, successful hidden-task feedback, completion/edit movement and modified drafts after failure.

The browser suite keeps all 25 Phase 2 behavior tests per engine and adds 17 per engine. Added coverage includes real editor creation, Today grouping, completion/reopening, due-date edits, refresh persistence, no search/filter/sort storage writes, Unicode/notes search, all deadline filters and all sort options, AND combinations, global counts, failure/retry copy, keyboard controls, both themes and responsive layouts. Local midnight and focus refresh are exercised in Asia/Yerevan and America/Los_Angeles, including year rollover. Date-only deadlines never pass through UTC parsing.

The storage model, version-1 schema, domain commands, repository, reducer/provider, date hook and theme implementation remain byte-identical to Phase 2. Existing stored tasks need no migration. Raw serialized task data is asserted unchanged by controls; sorting copies derived arrays, and writes still complete before committed state is published. Fault injection continues to verify quota, read, corrupt/unsupported data and cross-tab protection. No personal task collection was loaded or exported.

The existing duplicate-title deletion test now obtains the selected row's ID before deletion, because default sorting can change visual position. It still verifies exactly that identity was removed and the other remains. Browser editor field locators are scoped to the dialog to avoid accessible-name collisions with task titles. All Phase 2 assertions remain; no functional test was removed or skipped. The historical capture test retains its behavior and assertions but writes current captures to temporary test output, protecting the original 18 PNGs. The Phase 3 capture has the same one-browser evidence convention.

## Defects found and corrected during verification

- A new filter label initially collided with the editor's Due date locator. The filter is now explicitly labeled Deadline filter.
- Armenian case-expansion expectations exposed a Unicode fixture/normalization issue. Canonical uppercase/lowercase normalization and the correct Armenian uppercase fixture are tested, along with Greek sigma and Straße/STRASSE.
- New synthetic task titles containing “notes” exposed broad editor locators. They now target the open dialog; assertions were retained.
- A Clear search locator also matched Clear search and filters. Exact accessible-name matching resolved the test ambiguity.
- WebKit's native select ignored min-height and rendered at 22px. Explicit 44px height corrected the actual interface; the original touch-size checks remain.
- Type checking caught unsupported test-locator options and an intermediate edit syntax error before final verification. An in-progress diagnostic run against a stale build was stopped; only completed final runs support the results above.

An earlier complete cross-browser run had 123 passes, five WebKit size failures and four duplicate-capture skips. Those failures were fixed before the final run. No failing functional checks are accepted as completion evidence.

## Visual evidence and packaging

[Visual review](phase3-visual-review.md) indexes 14 actual Phase 3 Chromium captures, including the 12 requested states plus mobile active filters and Today empty. All 28 historical screenshots remain unchanged. The archive contains all 42 readable PNGs, source, tests, design/architecture/verification documentation, public assets, pinned manifest/lockfile and project configuration under `TaskManager_Web/`.

Packaging verifies exact membership, SHA-256 equality to the source files, ZIP CRC integrity, extraction/readback equality, every PNG's full decode, screenshot filename coverage against the capture test, and local documentation links. An explicit allowlist excludes dependencies, builds, tools, browser binaries, test output, caches, Git metadata, credentials and browser storage. Text is scanned for common credential patterns; screenshots contain only synthetic tasks. This is a bounded inspection, not a universal secret-detection guarantee. Packaging does not modify source files.

## Known limitations

Task storage remains local to one origin/browser profile and is not encrypted or backed up. Whole-document writes are synchronous; simultaneous tabs can still race despite stale-snapshot detection. Use one editing tab. Backup/restore is mandatory before any future public deployment and remains deferred. Search/filter/sort/view settings are session-only. Search preserves accents and is literal, not fuzzy/transliteration. Title sorting uses English collation. Native select appearance varies by engine; long labels can shorten in a closed control at 320px. Automated axe and viewport checks do not claim assistive-technology certification or physical-device testing.

## Exact file inventory against the approved Phase 2 working tree

Added (24):

- `docs/phase3-architecture.md`
- `docs/phase3-verification.md`
- `docs/phase3-visual-review.md`
- `docs/screenshots/phase3/01-today-desktop-light.png`
- `docs/screenshots/phase3/02-today-desktop-dark.png`
- `docs/screenshots/phase3/03-today-mobile-light.png`
- `docs/screenshots/phase3/04-today-mobile-dark.png`
- `docs/screenshots/phase3/05-overdue-tasks.png`
- `docs/screenshots/phase3/06-search-results.png`
- `docs/screenshots/phase3/07-active-filters.png`
- `docs/screenshots/phase3/08-sorting-interface.png`
- `docs/screenshots/phase3/09-no-results.png`
- `docs/screenshots/phase3/10-completed-tasks.png`
- `docs/screenshots/phase3/11-narrow-320px.png`
- `docs/screenshots/phase3/12-combined-search-filters.png`
- `docs/screenshots/phase3/13-mobile-active-filters.png`
- `docs/screenshots/phase3/14-today-empty.png`
- `src/app/TaskOrganization.test.tsx`
- `src/domain/taskSelection.test.ts`
- `src/domain/taskSelection.ts`
- `src/features/tasks/TaskToolbar.tsx`
- `tests/e2e/organization-helpers.ts`
- `tests/e2e/organization.spec.ts`
- `tests/e2e/phase3-evidence.spec.ts`

Modified (15):

- `README.md`
- `docs/phase2-architecture.md`
- `docs/phase2-verification.md`
- `docs/phase2-visual-review.md`
- `package.json`
- `src/app/App.tsx`
- `src/components/Icon.tsx`
- `src/components/WorkspaceState.tsx`
- `src/features/tasks/TaskEditor.tsx`
- `src/features/tasks/TaskRow.tsx`
- `src/features/tasks/WorkloadSummary.tsx`
- `src/styles.css`
- `tests/e2e/evidence.spec.ts`
- `tests/e2e/helpers.ts`
- `tests/e2e/prototype.spec.ts`

Removed: none.
