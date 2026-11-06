# Phase 2 verification and implementation report

Historical Phase 2 documentation, independently approved. Current behavior and evidence are documented in [Phase 3 architecture](phase3-architecture.md), [verification](phase3-verification.md), and [visual review](phase3-visual-review.md).

Date: October 27, 2026 (Asia/Yerevan). Phase 1 was independently approved. Phase 2 implements core local task management and awaits independent source/visual review. Phase 3 has not begun. Nothing was published or deployed, and Git remains uninitialized.

## Implementation summary

Implemented creation, editing, completion/reopening, confirmed deletion, actual task views/counts, local calendar date, persisted themes, runtime-validated versioned localStorage, and real failure/retry behavior. The approved Still identity and responsive structure are preserved. Fixture sources and the simulated-state component were removed.

Task fields are stable UUID, trimmed title, optional notes, completion Boolean, Low/Normal/High priority, optional calendar deadline, creation/modification timestamps, and optional completion timestamp. Pure domain commands preserve identity and immutable neighbors. No-op edits preserve modification time; reopen clears completion time.

A reducer/context stores the committed snapshot. The provider computes a command, validates and writes through the repository, then publishes state. Counts and views derive from that single snapshot. Drafts stay local to the editor. The storage adapter handles the `still.tasks` version-1 document; the separate `still.theme` preference stores all three supported modes. Unknown/corrupt storage is protected, failed mutations keep prior saved data, and failed forms retain their draft. See [architecture and storage contract](phase2-architecture.md).

## Final checks

| Check                  | Actual final result                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run typecheck`    | Passed, strict TypeScript                                                                      |
| `npm run lint`         | Passed, zero errors/warnings                                                                   |
| `npm test`             | 107 tests passed across 6 files; 0 failed; final run 2.40 seconds                              |
| `npm run build`        | Passed; 34 modules; 248.38 kB JavaScript (77.26 kB gzip), 30.27 kB CSS (7.51 kB gzip)          |
| `npm run format:check` | Passed; all matched files use Prettier style                                                   |
| `npm run test:e2e`     | 76 passed, 2 intentionally skipped, 0 failed; final full run 1.2 minutes                       |
| Accessibility          | 48 axe scans across both themes/all three engines; 0 violations                                |
| Responsive layouts     | 320/360/390/768/1440px, both themes, all three engines; passed                                 |
| Development smoke      | HTTP 200; StrictMode create/reload/delete, focus/scroll restoration; passed, 0 uncaught errors |
| Screenshot evidence    | 18 actual PNGs, decoded and visually inspected; original 10 screenshots unchanged              |

The 76 passing browser checks comprise **25 behavior/layout/accessibility tests in each engine (75)** plus **one Chromium screenshot-capture test**. Only equivalent Firefox/WebKit screenshot-capture tests are intentionally skipped; no behavior tests are skipped. The final suite adds full mobile lifecycle coverage to the earlier passing 73-check suite.

## Environment and exact commands

macOS ARM64; Node **24.22.1**, npm **12.2.0**, Vite **8.3.4**, Vitest **5.0.5**, Playwright **1.64.1**. Manifest and dependency lockfile were not changed; installed dependencies were reused. No clean reinstall or fresh dependency audit is claimed for Phase 2.

Playwright browser builds: Chromium **156.0.8078.4** (revision 1248, full Chromium headless channel), Firefox **157.0** (revision 1555), WebKit **27.2** (revision 2370 on this machine). These are browser-engine checks, not a claim of testing all installed retail browsers or physical devices.

Working directory: `<project-root>`.

```sh
# Use the documented Node.js version on PATH.
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers"
node --version
npm --version
npm exec -- prettier --write src tests public/theme-init.js index.html
npm exec -- prettier --write tests README.md docs/*.md
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
npm run test:e2e -- --project=chromium
npm run test:e2e
npm run dev -- --port 5173 --strictPort
```

The first Chromium command was an intermediate diagnostic run; the final unfiltered command runs all engines. Playwright manages `npm run preview -- --port 4173 --strictPort` for production tests. An additional isolated Chromium script loaded the development server and verified HTTP 200, StrictMode dialog opening/title focus, body scroll lock, real create, refresh, real delete, restored focus and scroll, and zero uncaught errors. The development server was stopped after verification.

PNG files were verified with Pillow `Image.verify()` and full pixel decoding, then visually inspected. All 18 files decode successfully, have nonempty dimensions/content, and show the actual application. The original ten Phase 1 PNGs match the pre-Phase-2 SHA-256 snapshot unchanged.

## Coverage and isolation

- **Domain/persistence/state/components:** required/trimmed/max-length/Unicode titles; optional and long notes; valid and invalid dates/leap years; priorities; identity and duplicate titles; immutable updates; timestamps and clock rollback; no-op edits; repeated completion/reopening; completed-task deletion; empty and 2,000-task collections; serialization; malformed/unsupported/invalid documents; duplicate IDs and timestamp invariants; unavailable storage/getter failures; quota/security write failures; stale snapshot protection; reducer retention/recovery; actual component workflows and rapid commands; persisted themes and date-boundary hook.
- **Desktop and mobile lifecycle:** create → refresh → edit all fields → refresh → complete → refresh → reopen → refresh, repeated twice, then delete a completed task → refresh. Runs at 1440px and 390px in each browser. Identity, content, timestamps, counts, visible lists and focus are asserted.
- **Error recovery:** injected native quota/security failures are removed and the same UI operation is retried successfully. Corrupt/unsupported data is checked for exact preservation, then a valid document is restored externally in the test and Retry loads it. No production reset path is used. Failed completion/deletion never falsely changes the saved task or visible checkbox.
- **Navigation and keyboard:** Open tasks / All tasks / Completed; editor initial focus, Tab and Shift+Tab containment, Escape, cancel/discard, duplicate-title deletion, focus after removed openers, skip link and reduced motion.
- **Themes:** all three choices survive reload, System follows OS changes, failed theme writes produce an honest session-only message. Blocking the application bundle confirms the head script independently applies the stored dark theme before React.
- **Responsive layouts:** 1440, 768, 390, 360, and 320 CSS-pixel widths, both themes, long unbroken titles, 5,000-character notes, editor, deletion, empty state, and storage failures. Checks document/dialog horizontal overflow and dialog bounds. Narrow forms may scroll vertically.
- **Accessibility:** eight axe scans per theme per browser: empty, creation, populated, edit, delete, failed delete, mobile with error banner, and storage-error view. WCAG 2 A/AA, 2.1 AA, and 2.2 AA tags. **48 scans, zero violations.**
- **Browser errors:** every behavior test collects uncaught page errors and requires an empty list, including recovery tests. Storage errors are expected handled exceptions; they do not escape into uncaught page errors.

Playwright starts a fresh browser context per test, with isolated origin storage. Fixed clocks and synthetic tasks make evidence reproducible. The second-tab test intentionally shares one context to test conflict behavior. Vitest clears local/session storage before each test and restores mocks/timers afterward. No personal browser profile or user task data is used.

Existing Phase 1 assertions for layout, native modal behavior, keyboard access, themes, skip links, reduced motion and accessibility remain. Prototype-only expectations were replaced with actual persistence/lifecycle assertions: refresh now preserves tasks/themes, Save is enabled, navigation is truthful, and errors are real. No behavior test is skipped.

## Failures found and resolved

1. The initial TypeScript pass caught Testing Library options copied from Playwright (`exact` is not a role-query option in RTL). Tests now use exact accessible names through RTL's supported API. The first browser-helper type pass also caught dynamic Storage method typing and form-element typing; the fault harness and `HTMLFormElement` cast were corrected.
2. ESLint rejected a render-prop closure that accessed a modal ref during render. The shared modal now receives ordinary children; close handlers access the nearest dialog only during events.
3. The first component suite had **106 passed / 1 failed**: deletion could restore focus before React removed its row. Focus restoration now runs in a layout effect after the committed dialog/row change. The full unit/component suite then passed.
4. The initial `npx prettier ...` command was unavailable in this environment. Formatting uses the installed tool through `npm exec -- prettier ...`; no package install was needed.
5. First Chromium browser run: **23 passed / 2 failed**. `.check()` waited for a checkbox that disappears when its task leaves Open tasks. Tests use the actual click and independently assert persisted completion, destination view, and focus.
6. First all-engine rerun: **67 passed / 6 failed / 2 skipped**. A screenshot-fixture-specific assertion was accidentally inserted into the generic navigation helper. It was scoped back to screenshot population. The next full run passed **73 / 0 failed / 2 skipped** before adding mobile full-lifecycle coverage.
7. Visual inspection caught a compositing artifact in the first 360px capture after viewport changes. The capture helper now resets full-page scroll and waits two rendering frames. The image was recaptured and visually checked; an additional scrolled failed-save screenshot demonstrates reachable actions.

No release-blocking failures remain in the final executed checks. Test-runner `NO_COLOR`/`FORCE_COLOR` warnings were informational. Local server/browser execution required sandbox escalation; only loopback servers were used.

## Visual changes and evidence

See the [18-image visual review](phase2-visual-review.md). The original desktop, mobile, and mobile-editor screenshots were compared directly with the new interface. Approved colors, font, hierarchy, sidebar/mobile tabs, reminder graphic, surfaces, and modal layout remain.

Necessary changes are truthful Open tasks/Total labels, actual checkboxes and delete buttons, functional save actions, read/write-error feedback, removal of fixture controls/project contexts, and larger important metadata. The screenshot tasks were entered through real creation controls and persisted by the app. Error screenshots use real failure paths with test-only storage faults.

## Remaining limitations and deferred scope

- localStorage belongs to one browser profile/origin/device; it is neither a cloud backup nor app-level encrypted storage. Private cleanup, site-data deletion, eviction, quota, device loss, or changing origin can affect availability.
- Whole-document writes are synchronous. 2,000 tasks were exercised; no unlimited scale or formal performance benchmark is claimed.
- Read/compare/write guards detect ordinary stale-tab changes but are not atomic. Use one editing tab; simultaneous writes can still race.
- Corrupt/unsupported data is preserved with Retry, not automatically repaired. Recovery requires externally restoring valid data; there is no reset/import/export UI. Drafts are retained only while the form stays open.
- Automated checks do not replace physical-device tests, screen-reader review, or independent visual approval. Screenshots are not established pixel baselines.
- Today/Upcoming grouping, search/filter/sort, calendar, projects/subtasks, drag-and-drop, notifications, accounts, synchronization, and backend services remain deferred. Backup/restore is still required before any future public deployment. Phase 3 is not authorized or started.

## Running locally

With a compatible Node/npm on PATH:

```sh
cd <project-root>
npm ci
npm run dev
```

For this already-installed workspace, `npm run dev` suffices after the README's optional PATH setup. Open the local URL printed by Vite, normally `http://127.0.0.1:5173`. For production preview, run `npm run build` then `npm run preview`. Development and preview ports have separate origin storage.

## Exact Phase 2 file inventory

Computed against the pre-implementation SHA-256 snapshot. Generated build output, Playwright traces/reports, installed dependencies, tools, and caches are excluded. The dependency manifest/lockfile and TypeScript/Vite/Tailwind/ESLint/Playwright configurations are unchanged.

### Created (38)

```text
docs/phase2-architecture.md
docs/phase2-verification.md
docs/phase2-visual-review.md
docs/screenshots/phase2/01-desktop-light.png
docs/screenshots/phase2/02-desktop-dark.png
docs/screenshots/phase2/03-mobile-light.png
docs/screenshots/phase2/04-mobile-dark.png
docs/screenshots/phase2/05-empty-workspace.png
docs/screenshots/phase2/06-create-task.png
docs/screenshots/phase2/07-edit-task.png
docs/screenshots/phase2/08-completed-task.png
docs/screenshots/phase2/09-delete-confirmation.png
docs/screenshots/phase2/10-storage-error.png
docs/screenshots/phase2/11-mobile-editor-dark.png
docs/screenshots/phase2/12-mobile-delete-dark.png
docs/screenshots/phase2/13-tablet-light.png
docs/screenshots/phase2/14-small-mobile-light.png
docs/screenshots/phase2/15-failed-delete.png
docs/screenshots/phase2/16-mobile-storage-error.png
docs/screenshots/phase2/17-mobile-failed-create.png
docs/screenshots/phase2/18-mobile-failed-create-actions.png
public/theme-init.js
src/app/useLocalDate.test.tsx
src/app/useLocalDate.ts
src/components/Modal.tsx
src/components/WorkspaceState.tsx
src/domain/task.test.ts
src/domain/task.ts
src/features/tasks/DeleteTaskDialog.tsx
src/lib/dates/calendar.test.ts
src/lib/dates/calendar.ts
src/lib/persistence/taskRepository.test.ts
src/lib/persistence/taskRepository.ts
src/state/TasksContext.ts
src/state/TasksProvider.tsx
src/state/taskState.test.ts
src/state/taskState.ts
tests/e2e/helpers.ts
```

### Modified (17)

```text
README.md
docs/design.md
docs/verification.md
docs/visual-review.md
index.html
src/app/App.test.tsx
src/app/App.tsx
src/app/useTheme.ts
src/components/Icon.tsx
src/features/tasks/TaskEditor.tsx
src/features/tasks/TaskGroup.tsx
src/features/tasks/TaskRow.tsx
src/features/tasks/WorkloadSummary.tsx
src/styles.css
src/test/setup.ts
tests/e2e/evidence.spec.ts
tests/e2e/prototype.spec.ts
```

### Removed (2)

```text
src/components/PreviewState.tsx
src/features/tasks/fixtures.ts
```
