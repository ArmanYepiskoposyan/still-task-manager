# Phase 5 — visual review

Date: 2026-11-02. Thirty actual Chromium browser screenshots document the implemented interface, using isolated synthetic tasks and projects. They are not illustrations, generated mockups or placeholders. The capture code is [phase5-evidence.spec.ts](../tests/e2e/phase5-evidence.spec.ts); its fixtures live only under tests. Capture uses the production build, actual native dialogs and a fixed synthetic clock on November 2, 2026. Screenshot PNGs were decoded and inspected; final archive verification repeats readability and byte-equality checks.

## Continuity with approved Phase 4

Compared [approved desktop light](screenshots/phase4/15-1440-light.png) and [approved narrow light](screenshots/phase4/05-320-light.png) with the Phase 5 desktop and narrow evidence below. The warm backgrounds, indigo accents, DM Sans, Still wordmark, summary metrics, rows, focus treatment, responsive controls and gentle reminder remain. Data and dates differ because the Phase 5 fixtures demonstrate new features; this is a visual inspection, not a pixel-baseline test.

New navigation adds Upcoming and Unassigned while retaining the two-column mobile arrangement. A native Projects selector keeps the list compact as projects accumulate. Backup and shortcut links are accessible without hover. Statistics add a restrained total/completed-today line within the existing summary. No decorative charts or animations were added.

## Reviewed states

- Desktop light/dark: navigation, project selector/counts, existing task rows, updated statistics and readable toolbar.
- Upcoming: chronological headings, incomplete-only tasks, priorities and actions, both themes.
- Project creation, editing, deletion: explicit keep-tasks wording, default safe focus, visible controls; assignment uses a native select in the existing task editor.
- Backup/export: local-only limitations, downloadable JSON and raw recovery data, file-size limit and no-merge wording.
- Import preview: actual validated task/project counts, separate acknowledgement and initially disabled replacement. The preview captures scroll the dialog to show its warning and confirmation controls.
- Invalid import and corrupted storage: readable error/warning copy, protected original data, recovery download access and explicit replacement path.
- Shortcut help: discoverable mappings, session disable control, keyboard focus and standard dialog behavior.
- Tablet 768px and mobile 390/360/320px in light/dark; additional 320px import, project and help dialogs.

All 30 images were reviewed in an overview, with desktop, tablet, narrow, confirmation and recovery details inspected at full size. Ordinary pages use full-page captures; open dialogs use viewport captures of their real scroll position. Long backup dialogs scroll vertically; confirmation controls are reachable, as checked in every engine. Native file controls abbreviate long filenames; the selected filename is also shown as wrapping text in the preview. Native project options may abbreviate long names when closed; the full selected project name is shown in the page heading and editor.

Two visual issues found during this phase were corrected: the confirmation checkbox label now aligns beside its checkbox, and an 80-character unbroken project name wraps in page headings and deletion descriptions instead of causing horizontal overflow. The latter is covered by a permanent three-engine regression test. At narrow widths the additional navigation and summary require more vertical scrolling; no feature requires horizontal scrolling or hover.

## Screenshot index

| File / implemented state                                                              | PNG dimensions |
| ------------------------------------------------------------------------------------- | -------------- |
| [01 desktop light statistics](screenshots/phase5/01-desktop-light-statistics.png)     | 1440 × 1109    |
| [02 desktop dark statistics](screenshots/phase5/02-desktop-dark-statistics.png)       | 1440 × 1109    |
| [03 upcoming dark](screenshots/phase5/03-upcoming-dark.png)                           | 1440 × 1109    |
| [04 upcoming light](screenshots/phase5/04-upcoming-light.png)                         | 1440 × 1109    |
| [05 project navigation](screenshots/phase5/05-project-navigation.png)                 | 1440 × 1109    |
| [06 project creation](screenshots/phase5/06-project-creation.png)                     | 1440 × 1050    |
| [07 project editing](screenshots/phase5/07-project-editing.png)                       | 1440 × 1050    |
| [08 project deletion](screenshots/phase5/08-project-deletion.png)                     | 1440 × 1050    |
| [09 task assignment](screenshots/phase5/09-task-assignment.png)                       | 1440 × 1050    |
| [10 backup export](screenshots/phase5/10-backup-export.png)                           | 1440 × 1050    |
| [11 import preview](screenshots/phase5/11-import-preview.png)                         | 1440 × 1050    |
| [12 import validation error](screenshots/phase5/12-import-validation-error.png)       | 1440 × 1050    |
| [13 shortcut help](screenshots/phase5/13-shortcut-help.png)                           | 1440 × 1050    |
| [14 768 light](screenshots/phase5/14-768-light.png)                                   | 768 × 1080     |
| [15 768 dark](screenshots/phase5/15-768-dark.png)                                     | 768 × 1080     |
| [16 390 light](screenshots/phase5/16-390-light.png)                                   | 390 × 1568     |
| [17 390 dark](screenshots/phase5/17-390-dark.png)                                     | 390 × 1568     |
| [18 360 light](screenshots/phase5/18-360-light.png)                                   | 360 × 1568     |
| [19 360 dark](screenshots/phase5/19-360-dark.png)                                     | 360 × 1568     |
| [20 320 light](screenshots/phase5/20-320-light.png)                                   | 320 × 1612     |
| [21 320 dark](screenshots/phase5/21-320-dark.png)                                     | 320 × 1612     |
| [22 320 import light](screenshots/phase5/22-320-import-light.png)                     | 320 × 900      |
| [23 320 project light](screenshots/phase5/23-320-project-light.png)                   | 320 × 900      |
| [24 320 shortcuts light](screenshots/phase5/24-320-shortcuts-light.png)               | 320 × 900      |
| [25 320 import dark](screenshots/phase5/25-320-import-dark.png)                       | 320 × 900      |
| [26 320 project dark](screenshots/phase5/26-320-project-dark.png)                     | 320 × 900      |
| [27 320 shortcuts dark](screenshots/phase5/27-320-shortcuts-dark.png)                 | 320 × 900      |
| [28 storage recovery workspace](screenshots/phase5/28-storage-recovery-workspace.png) | 1440 × 1050    |
| [29 storage recovery download](screenshots/phase5/29-storage-recovery-download.png)   | 1440 × 1050    |
| [30 storage recovery dark](screenshots/phase5/30-storage-recovery-dark.png)           | 1440 × 1050    |

## Scope of assurance

The browser suite checks layout at 320/360/390/768/1024/1440px, both themes, long task text, modal actions, keyboard controls and automated WCAG-tagged scans. The new feature-specific viewport matrix covers 320/360/390/768/1440px; the retained Phase 4 matrix also covers 1024px. Actual screen-reader speech, physical phones/tablets, OS high-contrast modes and real browser zoom were not manually certified. Equivalent 200%/400% desktop reflow checks are retained; they are not a claim of testing browser zoom itself.

All 68 historical screenshots from Phases 1–4 are preserved byte-for-byte. Historical capture tests now write their new-run images into temporary test output instead of overwriting approved evidence. See [verification](phase5-verification.md) for exact counts and [architecture](phase5-architecture.md) for behavior and limitations. No publication or deployment occurred.
