# Phase 3 visual review

Historical approved Phase 3 record. See the [Phase 4 audit](phase4-audit.md) and [verification](phase4-verification.md) for the subsequent quality review.

Reviewed locally on 2026-10-27. This is implementation evidence for independent review, not approval to start Phase 4.

## Provenance

All 14 images below are actual full-page Chromium screenshots of the production build, captured by `tests/e2e/phase3-evidence.spec.ts`. Synthetic tasks are created through the real editor, persisted through the application, and completed through its checkboxes. Search, navigation, filtering, sorting and themes use the real controls. No screenshot is a placeholder, generated illustration, or separately rendered mockup. The decorative reminder is part of the actual interface.

The browser clock is fixed to October 27, 2026, with creation times advanced deterministically. Desktop viewport: 1440 × 1050; mobile: 390 × 844; narrow mobile: 320 × 800. Full-page image heights can exceed viewport heights. Capture waits for loaded fonts and two animation frames, disables animations, and scrolls to the top. Fresh isolated browser contexts contain only synthetic test data.

## Screenshot index

| Image                                                                                 | Evidence                                                                   |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [01 — Today desktop light](screenshots/phase3/01-today-desktop-light.png)             | Two overdue and two due-today tasks; global metrics and restrained toolbar |
| [02 — Today desktop dark](screenshots/phase3/02-today-desktop-dark.png)               | Same task state with the approved dark palette                             |
| [03 — Today mobile light](screenshots/phase3/03-today-mobile-light.png)               | Four-view navigation, two-by-two metrics, stacked toolbar                  |
| [04 — Today mobile dark](screenshots/phase3/04-today-mobile-dark.png)                 | Readable metadata and controls in dark mode                                |
| [05 — Overdue tasks](screenshots/phase3/05-overdue-tasks.png)                         | Deadline filter narrows Today; completed tasks excluded                    |
| [06 — Search results](screenshots/phase3/06-search-results.png)                       | Literal portfolio query with matching count and clear action               |
| [07 — Active filters](screenshots/phase3/07-active-filters.png)                       | Status and priority controls, active pills, reset action                   |
| [08 — Sorting interface](screenshots/phase3/08-sorting-interface.png)                 | Focused alphabetical select and actual sorted task rows                    |
| [09 — No results](screenshots/phase3/09-no-results.png)                               | Distinct no-match explanation and recovery action                          |
| [10 — Completed tasks](screenshots/phase3/10-completed-tasks.png)                     | Completed-only view with retained task identity                            |
| [11 — Narrow 320px](screenshots/phase3/11-narrow-320px.png)                           | Full Today interface at the minimum tested width                           |
| [12 — Combined search and filters](screenshots/phase3/12-combined-search-filters.png) | One result from title/notes search AND three filters                       |
| [13 — Mobile active filters](screenshots/phase3/13-mobile-active-filters.png)         | Expanded filter panel and wrapping pills at 320px                          |
| [14 — Today empty](screenshots/phase3/14-today-empty.png)                             | After real completions, future/undated tasks remain accessible             |

Native select popups are platform-rendered; image 08 shows the selected sort and resulting order rather than an artificial dropdown overlay. The complete option strings remain available in the native popup; at 320px the closed select can shorten a long label. The persistent Sort by label and keyboard-accessible native control remain usable.

## Comparison with approved Phase 2

Compared the new screenshots with the approved [desktop](screenshots/phase2/01-desktop-light.png) and [mobile](screenshots/phase2/03-mobile-light.png) views and the existing Phase 2 visual record. All 28 historical Phase 1/2 PNGs are preserved byte-for-byte.

Still's wordmark, DM Sans, purple accent, warm surfaces, dark tokens, task metadata, reminder, sidebar, buttons and editor remain consistent. Functional additions are Today navigation, four truthful workload metrics, the compact toolbar, expanded filters, visibility feedback and new empty states. All tasks is one sorted collection so completed/incomplete grouping cannot silently override the chosen ordering. Today deliberately retains its two attention groups.

Desktop keeps the existing whitespace and sidebar proportions. Mobile uses two-by-two navigation and summary layouts; the search spans the width, sort/filter controls share the next row, and expanded fields stack. Active pills wrap without forcing horizontal scrolling. Task titles wrap, row actions remain visible, and metadata retains the Phase 2 size. The reminder continues to be omitted on narrow layouts as before.

All 14 captures were visually inspected: no unexpected overlap, horizontal overflow, missing content, broken images or blank placeholders were found. Search focus rings, active filters, completed styling and global-versus-result counts are visible. Both themes retain restrained contrast and semantic priority colors.

## Automated visual and accessibility checks

Browser tests cover 1440, 768, 390, 360 and 320px in both themes across Chromium, Firefox and WebKit, including expanded filters and no-results states. They assert document width does not exceed viewport width and search/select controls are at least 44px high. A real WebKit native-select defect (22px despite min-height) was corrected with explicit 44px height; the same assertions remain intact.

The complete suite additionally retains Phase 2 editor, delete dialog, storage error, reduced-motion, theme and responsive checks. Axe scans cover the new states in both themes and all three engines; exact final counts are in [verification](phase3-verification.md).

Automated scans and screenshots do not replace physical-device, screen-reader, high-zoom or independent human usability review. These are review artifacts, not approved pixel-regression baselines. No screenshot has been edited to conceal a defect.
