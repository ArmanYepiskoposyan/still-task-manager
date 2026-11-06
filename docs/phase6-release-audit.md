# Phase 6 release audit

Date: 2026-11-03. Status: release candidate prepared for independent review; publication is not authorized. This report supersedes historical phase status statements for the current source tree.

## Release scope and architecture

Still is a React 19 / TypeScript 6 / Vite 8 / Tailwind 4 browser-local web application. Its historical Java command-line origin explains the former repository name; the web application has no Java build step. The owner subsequently renamed the same repository to [ArmanYepiskoposyan/still-task-manager](https://github.com/ArmanYepiskoposyan/still-task-manager). This dated audit and its measurement files retain preparation-time findings; current repository status is documented in [repository notes](phase6-repository.md).

All approved features remain: task CRUD, completion/reopening, stable identities, notes/priorities/calendar deadlines, Today/Open/All/Completed/Upcoming/Unassigned views, projects and assignments, literal Unicode search, filters/sorting, workload statistics, JSON backup/restore and raw recovery, version-1 migration, validated schema-2 persistence, write-before-publish commits, cross-tab conflict detection, optional shortcuts, themes and responsive layouts. No new product feature, backend, account, analytics, advertising, synchronization or redesign was added.

The [Phase 5 architecture](phase5-architecture.md) remains the functional contract. Pure domain commands and selectors feed a reducer/context service. The repository validates complete snapshots and writes before publishing them. React renders task/project strings as text. Shared native dialogs manage keyboard containment and callers restore focus. View/filter/sort choices and shortcut enablement are session state; tasks, projects and theme preference persist separately.

## Source audit and data safety

Reviewed application composition, domain validation/commands/selectors, repository serialization and migration, backup parsing/downloads, provider state transitions, date/theme/shortcut hooks, task/project/workspace controls, shared modal/state/icon components, styles, static entry assets and configuration. Reviewed relevant existing tests alongside implementation and reran them against the production build. No speculative refactoring or test weakening was performed.

| Area                       | Finding and verification                                                                                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity and migration     | Schema 1 loads in memory with original task IDs and timestamps; schema 2 adds projects. Loading does not rewrite the raw document. Existing fixture and browser journeys verify migration, later commits and reload.                                                                 |
| Writes                     | A failed storage write leaves committed React state and stored data unchanged; the task draft remains available. Rapid commands use a synchronous committed-state cursor.                                                                                                            |
| Import                     | UTF-8 byte limit 10 MiB; full JSON/schema/duplicate/reference/date validation precedes preview. Explicit acknowledgement and replacement action are required. Failed replacement resets acknowledgement. File-selection sequence prevents an older read replacing a newer preview.   |
| Recovery                   | Corrupt and future-version documents remain untouched during loading and ordinary edits. Raw download preserves original text. Blocked reads are reported honestly. Recovery replacement is explicit and guarded by the expected raw token.                                          |
| Cross-tab changes          | Storage events warn; mutations, no-ops, exports and replacement compare current data. This is conflict detection, not transactional simultaneous-tab editing.                                                                                                                        |
| Rendering and links        | Task/project/filename text is escaped by React. No `dangerouslySetInnerHTML`, eval, dynamic script execution, application fetch endpoint or external asset dependency was found. Literal hostile-markup regression tests pass.                                                       |
| Navigation and time        | All views use component state, not URL paths. Deadline keys are calendar dates; local midnight/focus refresh and timezone/early-year tests remain.                                                                                                                                   |
| Errors and keyboard        | Failed writes, invalid imports, missing/stale records and unsupported storage are exercised. Native controls have labels; dialogs have names/descriptions; validation and mutation feedback use alerts/statuses.                                                                     |
| Dependencies and dead code | Direct runtime imports are React, ReactDOM and the self-hosted font; tooling dependencies map to build/type/lint/test/format scripts. No confirmed unused direct dependency or production demo-data path was found. No speculative cleanup of approved presentation styles was made. |

No known critical or high-severity functional or data-integrity defect remains from this review. This is a bounded source/test review, not a guarantee that no defect exists.

## Focused release corrections

1. **Development dependency advisory:** fresh audit found 12 moderate dependency paths arising from minimatch below 11.0.1 ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)). A pinned minimatch 11.0.1 override replaces 10.2.6 and adds its required `@isaacs/nonrecursive-glob-match` dependency. Other locked package versions remain unchanged. Type/lint/build and regression tests pass. This crosses a major version boundary, so compatibility is verified for this project rather than assumed universally; revisit the override when upstream lint dependencies adopt the patch.
2. **Reproducible CSS inputs:** fresh-copy comparison revealed different CSS when documentation was absent. Tailwind previously scanned the whole project. `src/styles.css` now restricts scanning to its source directory, per [Tailwind source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files). All existing semantic CSS rules remain; no visual redesign. Application styling rules are otherwise unchanged.
3. **Static asset portability:** Vite uses relative base URLs. Actual built files are tested at `/` and `/java-task-manager/` in three engines, without Vite's development fallback.
4. **JavaScript-disabled feedback:** the HTML entry includes a concise noscript notice. JavaScript remains required.
5. **Attribution:** complete notices for bundled React/ReactDOM/scheduler, Tailwind and DM Sans are shipped in `public/third-party-notices.txt` and copied into the production output.
6. **Release hygiene:** portable README, historical command-path cleanup, Node version pin, Git exclusions/line endings, verification-only CI, Vercel configuration and independent evidence. Historical Phase 5 screenshot assertions now write temporary regression captures, preserving approved evidence.

7. **Import-preview keyboard focus:** a WebKit rerun exposed an intermittent focus failure. The old `requestAnimationFrame` callback could run before React committed the preview. Focus now follows the preview's committed render via a layout effect. A component regression with animation frames withheld failed before the correction and passed afterward; it also confirms no storage write occurs during preview. Existing cross-browser focus assertions are retained.

## Security and dependency findings

`npm audit --json` after correction: **0 reported vulnerabilities**, including dev dependencies. `npm audit --omit=dev --json`: **0**. `npm audit signatures`: **255 registry signatures and 110 attestations verified**. These are dated registry observations, not a permanent security guarantee. Before/after JSON is retained under `docs/measurements/`.

Dependency lock integrity is exercised by clean `npm ci`; `npm ls --all` checks the installed tree. The npm 12 clean install warns that the optional fsevents install script is blocked by its default script policy; no required build/test step fails, and no blanket script-approval override was added. Runtime uses supported Node 24 tooling; tested Node 24.22.1 / npm 12.2.0.

Only the built static directory is a deployment input. No source maps, development source files, credentials, test endpoints or dependency folders are emitted. Fonts and theme bootstrap are local assets. Static release tests observe zero external requests, failed asset requests or uncaught page errors. HTTPS-hosted behavior and provider headers remain unverified until authorized deployment; there are no hard-coded HTTP application resources or backend requirements.

The review package is allowlisted and scanned for private-key/token patterns, credential filenames and personal paths. Only synthetic fixtures/screenshots are included. Public GitHub account/repository identification and third-party copyright/contact notices are intentional. No personal browser workspace is exported. Pattern scanning cannot prove the absence of every conceivable secret; file selection and source review supplement it.

## License and asset review

Runtime library licenses are MIT; DM Sans is SIL Open Font License 1.1. Full applicable notices are included with the built assets. Direct tooling metadata includes MIT, Apache-2.0 and MPL-2.0; see [dependency inventory](measurements/phase6-direct-dependencies.json). Tooling is installed from npm, not copied into this review archive. Inline icon SVG, favicon and CSS illustration are repository assets; no external icon pack, stock photograph or generated screenshot illustration was introduced. Historical design documentation describes the identity as original; this audit does not establish independent legal provenance of every geometric SVG shape.

**REQUIRES OWNER ACTION:** decide the project's license. MIT is a practical recommendation for a permissive portfolio project; its [official text](https://opensource.org/license/mit) requires retaining copyright/permission notices. No project LICENSE was created or chosen, and third-party notices do not grant a license to the application's original code.

## Limits and remaining checks

Browser-local storage is origin/profile-specific, unencrypted by the app and subject to quota, clearing, eviction and device loss. Backups are explicit, local downloads and not cloud backup. Use one editing tab; truly simultaneous writes can race. Full-list rendering and whole-document serialization can pause at large volumes. Backup import replaces rather than merges. No browser extension, screen-reader, physical-device or OS high-contrast certification is claimed.

See [verification](phase6-verification.md), [visual review](phase6-visual-review.md), [repository preparation](phase6-repository.md), [deployment](deployment.md) and [release checklist](release-checklist.md) for VERIFIED / NOT VERIFIED / REQUIRES OWNER ACTION distinctions.
