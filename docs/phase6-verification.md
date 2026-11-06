# Phase 6 verification report

Date: 2026-11-03. Release preparation only; no GitHub push or website deployment. Read this with the [release audit](phase6-release-audit.md), [exact changed-file inventory](phase6-changed-files.md), [visual review](phase6-visual-review.md), [repository inspection](phase6-repository.md) and [release checklist](release-checklist.md).

## Environment and command results

macOS ARM64, Apple M2, 8 logical CPUs, 8 GiB RAM. Node 24.22.1 and npm 12.2.0. Playwright 1.64.1: Chromium 156.0.8078.4 (full Chromium channel), Firefox 157.0 and WebKit 27.2. Browser tests use production preview on loopback, two workers, fresh contexts, synthetic data and no local retries. Linux GitHub-hosted execution is not represented by these macOS results.

| Command                                                                                                                                          | Final result                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `npm ci --prefer-offline --cache <npm-cache> --no-audit`                                                                                         | Clean isolated source copy; 255 packages installed. Cache is optional and only speeds verified locked tarball retrieval. |
| `npm run typecheck`                                                                                                                              | Passed                                                                                                                   |
| `npm run lint`                                                                                                                                   | Passed, zero warnings                                                                                                    |
| `npm test`                                                                                                                                       | **282 passed, 14 files**, including the new import-focus regression                                                      |
| `npm run build`                                                                                                                                  | Passed, 42 modules                                                                                                       |
| `npm run check`                                                                                                                                  | All constituent checks passed in working and clean copies                                                                |
| `npm run format:check`                                                                                                                           | Passed                                                                                                                   |
| `npm run test:e2e`                                                                                                                               | **242 passed, 10 capture-only skips, 0 failures** (4.2 minutes)                                                          |
| `npm exec -- playwright test tests/e2e/phase5.spec.ts --project=webkit --grep 'responsive and accessible at 390px' --repeat-each=10 --workers=1` | **10 passed, 0 failures** (1.1 minutes)                                                                                  |
| `npm run test:release`                                                                                                                           | **6 passed** against the clean-install build; zero page/asset/external-request errors                                    |
| `npm audit --json`                                                                                                                               | **0 reported vulnerabilities** after correction; 12 moderate paths before                                                |
| `npm audit --omit=dev --json`                                                                                                                    | **0 reported vulnerabilities**                                                                                           |
| `npm audit signatures`                                                                                                                           | **255 registry signatures, 110 attestations verified**                                                                   |
| `npm ls --all`                                                                                                                                   | Passed; installed tree valid                                                                                             |
| `npm cache verify --cache .npm-cache`                                                                                                            | Passed; 548 entries verified at audit time                                                                               |
| `npm run test:performance`                                                                                                                       | Fresh production measurements linked below                                                                               |

Public reproduction uses ordinary installed Node/npm, not personal paths, private runtimes, global application packages or credentials. From the ZIP's `TaskManager_Web` directory, use Node from `.nvmrc`, `npm ci`, `npm run format:check`, `npm run check`, `npm exec -- playwright install chromium firefox webkit`, `npm run test:e2e`, and `npm run test:release`. On Linux add Playwright's `--with-deps`. Start `npm run preview -- --port 4173 --strictPort` before the optional performance command. Standard `npm ci` needs registry access or an existing valid npm cache.

The clean-install check started with no node_modules or dist, copied the release-candidate source/configuration/assets, installed from the lockfile, then ran types, lint, all unit/component tests and build. Final production-build hashes are compared between working and clean copies. The source is not yet on GitHub, so a remote clone-and-run of this release is **NOT VERIFIED**; the README's clone command becomes usable after authorized publication. No undocumented tool is required by the project.

## Browser and data-integrity coverage

The final functional suite retains **79 functional cases per engine**. Five Chromium screenshot writers produce current regression/final evidence; ten Firefox/WebKit skips avoid duplicate screenshot writers. No functional test is intentionally skipped or weakened. Tests exercise task/project CRUD and stable IDs, navigation, Today/Upcoming and calendar boundaries, search/filters/sorts, themes, persistence/reload, version-1 migration, actual JSON downloads and complete import validation, explicit replacement, quota/blocked-storage failures, corrupt/future-schema protection, raw recovery, external-tab conflicts, literal hostile markup, rapid actions, keyboard focus and short/long-content responsive layouts.

The static release script adds **six cases**: three engines × root/subpath. These run ordinary static servers over `dist/`, load fonts/theme, create a synthetic project and task, refresh, parse the actual exported backup and check project references, page errors, request failures, external requests and overflow. They supplement rather than replace the full persistence suite.

## Diagnostic failures and correction

The initial complete suite passed 242 cases with ten capture-only skips. After making CSS generation independent of documentation, a rerun reported one WebKit 390px import-preview focus failure (241 passed, ten skipped). Inspection found focus scheduled in requestAnimationFrame before a guaranteed React commit. A new component test that withholds animation frames reproduced the defect: one failed, nine passed in that file. Moving focus into a layout effect tied to the rendered preview fixed the deterministic test. The final unit total is 282. Full browser rerun and ten targeted WebKit repetitions verify the correction without increasing timeouts, disabling assertions or adding local retries.

Screenshot review also caught four new images whose filenames said light while the prior dark theme persisted. The capture test now explicitly chooses Light before those scenes. This was an evidence-fixture correction, not an application theme defect. Final images were recaptured from the actual build.

## Accessibility assessment

Automated suite coverage is **279 axe scans** across applicable WCAG 2 A/AA, 2.1 AA and 2.2 AA tags; the final full suite reports **zero violations**. Tested token contrast thresholds are 4.5:1 for normal text/status pairs and 3:1 for selected focus/control boundaries. Native dialog names/descriptions, form labels, validation/status feedback, keyboard containment/restoration, reduced-motion transitions, touch-target/layout checks and reflow are retained. Responsive widths include 320, 360, 390, 768, 1024 and 1440px, plus 720/320px equivalent desktop-zoom reflow.

Genuine manual keyboard steps and observed focus states are documented in [visual review](phase6-visual-review.md). **NOT VERIFIED:** screen-reader speech/navigation, real 200%/400% browser zoom, physical devices, OS high-contrast, older engines or universal WCAG conformance. WebKit automation is not a claim of testing Safari on a physical iPhone.

## Performance and production assets

Fresh benchmark: [phase6-performance.json](measurements/phase6-performance.json). Four isolated contexts at each size: 100 tasks/3 projects, 1,000/20 and 3,000/50. Measures observed completion plus two animation frames for render/search/sort/project/Upcoming/export/import/restore. This includes automation overhead, uses an uncontrolled local machine and is **not INP, a Lighthouse score or field data**. No browser regression suite runs concurrently with the benchmark. Whole-document validation/serialization and full DOM rendering remain scaling limits.

| Tasks / projects | Render | Search |   Sort | Project | Upcoming | Export | Import preview | Restore |
| ---------------- | -----: | -----: | -----: | ------: | -------: | -----: | -------------: | ------: |
| 100 / 3          |  97.58 |  33.09 |  36.43 |   31.54 |    96.48 |  63.49 |          63.97 |   80.03 |
| 1,000 / 20       | 197.85 |  47.67 | 104.74 |   47.16 |   152.44 |  86.54 |         190.43 |  215.23 |
| 3,000 / 50       | 437.65 |  95.92 | 289.57 |  102.50 |   295.21 | 125.74 |         479.95 |  512.25 |

Medians are milliseconds. At 3,000 tasks, restore is about 512 ms and import preview about 480 ms on this machine. Larger records or slower devices can be less responsive; no virtualization or worker-based persistence was introduced.

Final JS is approximately 274.30 kB / 84.27 kB gzip; CSS 38.80 kB / 8.98 kB gzip. Two fonts total approximately 55.15 kB. The build includes HTML, theme bootstrap, favicon and third-party notices; no source maps. Exact bytes/hashes are recorded in the production asset inventory. There is no claim of a performance improvement from the small release changes.

## Security, privacy, licensing and hosting

See before/after [full audit](measurements/phase6-dependency-audit.json), [production audit](measurements/phase6-production-audit.json), [dependency licenses](measurements/phase6-direct-dependencies.json), and [release audit](phase6-release-audit.md). The minimatch override addresses the observed development dependency advisory; no app runtime dependency was added. Registry integrity/signatures and clean installation passed. Credentials and personal tasks are excluded by selected paths, review and scanning, not by exporting browser data.

Storage is browser-local, origin-specific, unencrypted and not transactional across simultaneous tabs. JSON backups are user-managed, not cloud backups. Project license selection requires owner approval; third-party notices are included. Vercel is preferred with prepared static configuration; provider build, public HTTPS, hosted CI and rollback remain **NOT VERIFIED**.

## Local Git and package status

Existing public repository inspected empty before initialization; `main` configured default, no commits/files/refs. Local `main`/SSH `origin` prepared. Effective author name/email unset; no commit, push, new remote repository or deployment. Final staged-file review and review archive checks are recorded below. Author identity, project license, independent acceptance and publication/deployment permission are **REQUIRES OWNER ACTION**.

## Final verification evidence

**VERIFIED:** 282 unit/component tests (14 files); 242 browser cases (84 Chromium, 79 Firefox, 79 WebKit), ten capture-only skips, zero failures; 279 axe scans with zero violations; ten additional WebKit focus-regression repetitions; six clean-build root/subpath cases; formatting, typechecking, lint, build and dependency audits. No functional test was skipped.

The eight production files from the working and clean-install directories have identical SHA-256 hashes, recorded in [build inventory](measurements/phase6-build.json). Final benchmark raw trials and all 24 production screenshot dimensions are retained. All 98 historical screenshots remain byte-identical to the approved Phase 5 package. No baseline project file was deleted.

Archive validation checks ZIP CRC, safe member paths, all source/tests/configuration inclusion, SHA-256 equality of every extracted member with its source, full decoding of all 122 PNGs, and credential/private-path patterns. The archive excludes dependencies, dist, tools/browsers, caches, test/coverage output, secrets, personal task data and Git metadata. Exact Desktop archive path, file count, bytes and SHA-256 are supplied in the delivery report after these checks; archive size/hash are deliberately not embedded in the archive itself.

The exact changed/new-file inventory is [phase6-changed-files.md](phase6-changed-files.md). The Git index is reviewed against the same release file set before delivery; no author identity is inferred and no commit/push/deployment occurs. Public source and hosted execution remain pending owner authorization.
