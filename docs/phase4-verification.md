# Phase 4 verification

Verified on 2026-10-27. This is the review record for Phase 4 only; Phase 5, Git initialization, publication and deployment are not performed.

## Environment and commands

macOS ARM64, Apple M2 (eight logical CPUs), 8 GiB RAM, Node 24.22.1, npm 12.2.0; pinned React 19.3.1, TypeScript 6.0.3, Vite 8.3.4, Vitest 5.0.5, Playwright 1.64.1. Full Chromium 156.0.8078.4 (revision 1248), Firefox 157.0 (1555) and WebKit 27.2 (2370) run from the project's installed Playwright browsers. No dependency/lockfile update.

```sh
export PATH="$PWD/.tools/bin:$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers"
npm ls --all --json
npm audit --json
npm audit signatures
npm cache verify --cache .npm-cache
npm run check
npm run test:e2e
npm run format:check
```

`npm run check` executes `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` (which also checks types). Playwright manages a local production preview on port 4173. All test contexts are isolated from normal browser profiles. The machine-specific PATH fallback is unnecessary with a compatible system Node installation. Another reviewer can use `npm ci`, install Playwright browsers, build and run the same commands.

Performance commands, with production preview running separately:

```sh
node tests/performance/measure.mjs before
npm run test:performance
```

The before command was executed against the unchanged approved Phase 3 build before corrections. The after command targets the final Phase 4 build. Do not rerun `before` against a changed build and interpret it as a historical baseline. The included raw reports retain all three samples per task count.

## Final verification results

| Check                                 | Result                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Dependency tree / manifest / lockfile | Passed; all direct installed versions match exactly                                                                 |
| Registry vulnerability audit          | 0 known vulnerabilities in all severity categories                                                                  |
| Registry signatures / attestations    | 254 signatures and 110 attestations verified                                                                        |
| Cache integrity                       | 548 content entries verified                                                                                        |
| TypeScript                            | Passed; zero errors                                                                                                 |
| ESLint                                | Passed; zero warnings/errors                                                                                        |
| Unit/component tests                  | 212 passed, 10 files, zero failed/skipped; final run 10.00 seconds                                                  |
| Production build                      | Passed; 36 modules; delivery build 277 ms                                                                           |
| Full Playwright suite                 | 177 passed, 6 duplicate capture skips, zero failed/interrupted; 10.3 minutes                                        |
| Chromium                              | 61 passed: 58 behavior checks plus three evidence captures                                                          |
| Firefox                               | 58 passed; three duplicate captures skipped                                                                         |
| WebKit                                | 58 passed; three duplicate captures skipped                                                                         |
| Automated accessibility               | 156 axe scans; zero violations under configured WCAG A/AA tags                                                      |
| Contrast                              | Text/status/primary-button pairs ≥4.5:1; audited control borders/focus pairs ≥3:1, both themes                      |
| Responsive layouts                    | All six requested widths, both themes, all three engines passed                                                     |
| Manual keyboard                       | Inspected light/dark editor focus, keyboard trapping/restoration, skip link, validation and toolbar/theme operation |
| Formatting                            | Passed; all matched files use Prettier style                                                                        |

The six skips are only duplicate Phase 2/3/4 screenshot-capture jobs on Firefox and WebKit. All functional scenarios execute in all engines. Axe totals: 48 retained Phase 2 scans + 36 retained Phase 3 scans + 72 Phase 4 scans (main/editor × six widths × two themes × three engines). The tags are `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`. No functional case was deleted or skipped.

Production JavaScript: 256.36 kB / 79.63 kB gzip; CSS: 35.68 kB / 8.46 kB gzip, plus local DM Sans fonts. The task model, selection semantics, reducer, local-date hook, theme implementation and native modal source remain byte-identical to Phase 3. Only the targeted application corrections described in the audit were made.

Logs retained outside the project include `<temporary-log-directory>/still-phase4-check-final.log`, `still-phase4-typecheck-final.log`, `still-phase4-lint-final.log`, and `still-phase4-browser-complete.log`. Raw performance and npm audit reports are included under `docs/measurements/`.

## Coverage and retained regressions

All 186 prior unit/component cases remain. The 26 new cases exercise storage-event scope, revoked storage, recovery focus, failure in the middle of rapid commands, hostile persisted structures, prototype-like fields, deterministic serialization and cached calendar formatting. No prior assertion is removed.

All 128 prior successful browser executions remain, including their two Chromium capture tests. Phase 4 adds 16 behavior tests per engine and a Chromium evidence capture. Existing Phase 2/3 capture assertions remain, but write temporary output rather than overwriting historical images. New checks cover sessionStorage isolation, failure/recovery focus, stale edit/delete dialogs after another tab deletes a task, literal script/Unicode content, rapid completion/reopening, date labels in UTC+14/UTC−11, six viewport widths, both themes, maximum-length content, dialog/no-results/error reflow, computed contrast and accessibility scans.

The midnight tests install a minute before the intended pause target, avoiding a WebKit “Cannot fast-forward to the past” race, and pause the virtual clock before navigation. The original Phase 2 test then advances exactly 1,000ms across the boundary; both date assertions remain. Control-size checks round bounding-box measurements to 0.01px before comparing with the original 44px minimum, accommodating Firefox's 43.99994px representation of a 44px control. This does not change CSS or permit a materially smaller target.

## Genuine manual keyboard audit

The agent used native keyboard input in the desktop embedded browser, observed accessibility focus and screenshots after actions, and did not rely solely on scripted assertions. Checked skip-to-main, Enter opening New task, initial title focus, blank-title validation, Shift-Tab wrapping to Create task, forward wrapping to Close, Escape returning to New task, search typing/clearing returning focus, filter expansion, Sort by focus, and Space activating light/System themes. Modal focus styling was inspected in light and dark modes. The original System theme was restored and the temporary browser tab closed. No personal tasks were present or used.

Desktop zoom shortcuts had no observable effect in this embedded surface; actual browser zoom remains unverified. The automated reflow tests explicitly use equivalent CSS viewport widths. Actual screen-reader output and physical-device interactions were not tested. Axe and accessibility-tree inspection are not a certificate of WCAG conformance.

## Performance and browser memory

Three samples per size in Chromium, using deterministic tasks with varied dates/priorities and roughly 300 characters of notes. Each sample gets a fresh context, seeds a valid version-1 document, and reloads. Initial rendering includes navigation, the expected row count, font readiness and two animation frames. Interaction times include Playwright overhead, observable DOM completion and two frames; they are not INP measurements. No E2E browser suite ran concurrently with the complete measurement runs. The desktop was not an isolated benchmark appliance; other host activity and thermal/memory conditions were not controlled.

Raw samples: [before](measurements/phase4-performance-before.json), [after](measurements/phase4-performance-after.json). Values below are medians in milliseconds.

| Build / tasks  | Initial render | Search | Clear search | Filter |   Sort | Complete | Raw setItem |
| -------------- | -------------: | -----: | -----------: | -----: | -----: | -------: | ----------: |
| before / 100   |         135.05 |  54.96 |        66.77 |  59.16 |  58.66 |   133.20 |        0.10 |
| before / 1,000 |         240.16 |  93.59 |       167.64 | 119.60 | 180.61 |   199.94 |        0.40 |
| before / 3,000 |         642.21 | 121.67 |       367.46 | 157.37 | 529.82 |   333.32 |        1.40 |
| after / 100    |         244.17 |  64.56 |        82.52 |  78.46 |  80.83 |    99.42 |        0.20 |
| after / 1,000  |         580.09 | 107.61 |       266.53 |  97.85 | 305.00 |   199.88 |        1.20 |
| after / 3,000  |        1226.90 | 197.94 |       732.04 | 192.06 | 940.75 |   399.60 |        3.10 |

`Raw setItem` times only the synchronous browser storage call; JSON validation/serialization and React work are included in the completion measurement, not that column. Search/filter/sort changes perform no task-storage writes. Three thousand tasks form a practical stress case, not a promised capacity limit.

The separate end-to-end runs show slower later timings, so they do **not** establish an overall speedup. The formatter micro-check isolated a real repeated-construction cost (3,000 calls: 74.9ms versus 1.6ms with one formatter), but its benefit is only part of total rendering. An alternating comparison against the archived approved build follows to reduce time-order bias. No broad optimization or virtualization was introduced on the strength of noisy timings.

### Alternating render comparison

The approved Phase 3 archive was extracted only to a temporary directory, verified against all 103 pre-audit hashes, and built with the same installed dependencies. Its preview ran on 4183; Phase 4 ran on 4173. `node tests/performance/compare-render.mjs` performed four trials per build and size, alternating which build runs first. No other browser suite or build ran during this comparison. [All raw samples](measurements/phase4-render-comparison.json) are included.

| Tasks | Approved Phase 3 median ms | Phase 4 median ms |  Difference |
| ----- | -------------------------: | ----------------: | ----------: |
| 100   |                     111.16 |             99.25 | 10.7% lower |
| 1,000 |                     307.13 |            271.78 | 11.5% lower |
| 3,000 |                    1837.66 |           1611.44 | 12.3% lower |

This controlled-order comparison supports a modest local rendering benefit from the targeted formatter change, not a broad performance guarantee. The 3,000-task trials vary substantially (including one pair where Phase 4 is slower), and later timings are much higher than the first baseline. Reported medians are not confidence intervals. Large full-DOM collections can still take over a second to render on this machine. No claim of instant or unlimited-scale performance is made.

### Memory observations

Chromium CDP measures JS heap after explicit garbage collection, plus DOM-node and event-listener counts. These are not total process RSS or cross-engine memory results. The baseline checks ten search/clear cycles; the final runner also adds a second ten-cycle block to distinguish warm-up retention from continued growth.

| Tasks | Initial JS heap MiB | After 10 cycles MiB | After 20 cycles MiB | DOM nodes after 10 / 20 | Listeners after 10 / 20 |
| ----- | ------------------: | ------------------: | ------------------: | ----------------------- | ----------------------- |
| 100   |                2.80 |                3.82 |                3.89 | 2529 / 2539             | 473 / 473               |
| 1,000 |                7.38 |                9.26 |                9.34 | 21429 / 21439           | 3173 / 3173             |
| 3,000 |               17.49 |               21.26 |               21.30 | 63429 / 63439           | 9173 / 9173             |

Heap growth is mostly during initial interactions. DOM and listener counts remain stable between the two cycle blocks, with only small/non-monotonic heap differences after collection. No continued unbounded growth was observed in this bounded exercise; it does not prove that no memory leak is possible. Entire task lists still render in the DOM, so costs grow with collection size. Slower devices and larger collections may need evidence-driven future work. Whole-document localStorage writes and quota remain limitations.

## Intermediate failures and their disposition

The first type check caught Playwright-only `exact` options mistakenly used in new Testing Library calls; the options were removed. New component tests initially used a shortened Retry name; they now use the actual accessible name. The determinism test exposed confirmed serializer issue R2, documented before correction; its assertion remains unchanged.

The first full browser diagnostic exposed a new contrast calculator's assumption that hex colors always have six digits; production CSS legitimately minifies white to `#fff`. The calculator now expands three-digit hex before evaluating the same ratios. Firefox's subpixel geometry and the existing unpaused midnight clock were corrected in the harness as described above. The first complete diagnostic had 168 passed, 9 failed and 6 skipped. A follow-up diagnostic was stopped after overall scenario timeouts (75 passed, 2 failed, 2 interrupted, 3 skipped, 101 not run). The final complete run used 60-second scenario budgets, with 90 seconds for the 26-image capture, and unchanged assertion timeouts; it passed all 177 applicable executions. Final results above refer only to that completed run.

## Review package checks

The review ZIP includes application source, all tests (including the reproducible performance runner and synthetic fixture), configurations, pinned manifest/lockfile, documentation, raw measurement/security reports, 26 Phase 4 images and all 42 unchanged historical images. The two Phase 4 “before” images were captured before source corrections; the other images show the final implemented interface.

Packaging uses explicit project directories/root configuration files; excludes dependencies/builds/tools/browser binaries/caches/test output/credentials/personal storage; checks archive CRCs, exact member/hash equality, extraction/readback, every PNG decode and local documentation links. A common-secret-pattern scan covers packaged text. Synthetic task data in tests/screenshots is intentional. These checks do not claim universal secret detection.

## Exact changed-file inventory

Added (40):

- `docs/measurements/phase4-dependency-audit.json`
- `docs/measurements/phase4-performance-after.json`
- `docs/measurements/phase4-performance-before.json`
- `docs/measurements/phase4-render-comparison.json`
- `docs/phase4-audit.md`
- `docs/phase4-verification.md`
- `docs/phase4-visual-review.md`
- `docs/screenshots/phase4/01-before-narrow-light.png`
- `docs/screenshots/phase4/02-before-narrow-dark.png`
- `docs/screenshots/phase4/03-after-narrow-light.png`
- `docs/screenshots/phase4/04-after-narrow-dark.png`
- `docs/screenshots/phase4/05-320-light.png`
- `docs/screenshots/phase4/06-320-dark.png`
- `docs/screenshots/phase4/07-360-light.png`
- `docs/screenshots/phase4/08-360-dark.png`
- `docs/screenshots/phase4/09-390-light.png`
- `docs/screenshots/phase4/10-390-dark.png`
- `docs/screenshots/phase4/11-768-light.png`
- `docs/screenshots/phase4/12-768-dark.png`
- `docs/screenshots/phase4/13-1024-light.png`
- `docs/screenshots/phase4/14-1024-dark.png`
- `docs/screenshots/phase4/15-1440-light.png`
- `docs/screenshots/phase4/16-1440-dark.png`
- `docs/screenshots/phase4/17-editor-light.png`
- `docs/screenshots/phase4/18-delete-light.png`
- `docs/screenshots/phase4/19-failed-save-light.png`
- `docs/screenshots/phase4/20-no-results-light.png`
- `docs/screenshots/phase4/21-editor-dark.png`
- `docs/screenshots/phase4/22-delete-dark.png`
- `docs/screenshots/phase4/23-failed-save-dark.png`
- `docs/screenshots/phase4/24-no-results-dark.png`
- `docs/screenshots/phase4/25-dense-light.png`
- `docs/screenshots/phase4/26-dense-dark.png`
- `src/app/Reliability.test.tsx`
- `src/lib/persistence/security.test.ts`
- `tests/e2e/phase4-evidence.spec.ts`
- `tests/e2e/quality.spec.ts`
- `tests/fixtures/tasks.ts`
- `tests/performance/compare-render.mjs`
- `tests/performance/measure.mjs`

Modified (15):

- `README.md`
- `docs/phase3-architecture.md`
- `docs/phase3-verification.md`
- `docs/phase3-visual-review.md`
- `package.json`
- `playwright.config.ts`
- `src/app/App.tsx`
- `src/lib/dates/calendar.test.ts`
- `src/lib/dates/calendar.ts`
- `src/lib/persistence/taskRepository.ts`
- `src/state/TasksProvider.tsx`
- `src/styles.css`
- `tests/e2e/organization.spec.ts`
- `tests/e2e/phase3-evidence.spec.ts`
- `tests/e2e/prototype.spec.ts`

Removed: none.
