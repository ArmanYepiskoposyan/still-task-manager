# Phase 3 architecture and behavior

Historical approved Phase 3 record. See the [Phase 4 audit](phase4-audit.md) and [verification](phase4-verification.md) for the subsequent quality review.

Phase 2's task model, version-1 storage document, repository, reducer/context, and write-before-publish sequence remain intact. No migration, new dependency, backend, or new storage key is introduced. Phase 3 derives organization from committed tasks plus a current local calendar day and ephemeral view controls.

## Selection pipeline

`src/domain/taskSelection.ts` is independent of React and storage:

1. Select the current view's membership.
2. Apply status, priority and deadline filters with AND.
3. Apply the trimmed literal query to the title OR notes.
4. Sort a copied collection using the selected comparator and explicit tie-breaking.
5. Split Today into Overdue then Due today, preserving the selected order within each group.

`selectTasks` returns the unfiltered view count, visible tasks, and nonempty groups. `workload` derives global counts independently. `App` memoizes these pure calculations from the committed snapshot, selection and local date. No derived result is written to task persistence, and no persistent array is sorted in place. Tasks retain their IDs and original saved order.

The existing context/reducer continues to own committed data. `App` owns the selected navigation view, query, filter values, sort choice, dialogs and a contextual saved-task message. `TaskToolbar` owns only whether the filter panel is expanded and its search focus ref. Drafts remain in the existing editor. No competing editable task collection is introduced.

## Views and dates

| View       | Membership                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------- |
| Today      | Incomplete tasks whose deadline is before or equal to the current local date; no undated tasks |
| Open tasks | All incomplete tasks, regardless of deadline                                                   |
| All tasks  | Every task, including completed tasks                                                          |
| Completed  | Completed tasks only                                                                           |

**Overdue** means incomplete with a deadline strictly before today. **Due today** means incomplete with a deadline exactly equal to today. Completed tasks never contribute to either attention group or count.

Validated `YYYY-MM-DD` keys compare lexically; no deadline is parsed as a UTC instant. The existing `useLocalDate` hook uses local calendar getters, schedules the next local midnight, and refreshes on window focus and visibility changes. The same local-date value drives groups, filters, navigation counts and global workload. Deadline validation and leap-year handling stay in the original calendar module. Tests cover leap days, month/year transitions, local midnight and clock changes in positive and negative UTC offsets.

Open tasks remains the initial view for continuity with Phase 2. Today is the first navigation option and is one action away. View/control choices are not persisted: reload returns to Open tasks, empty search, neutral filters, and due-date sorting. Saved tasks and theme preferences still survive reload.

## Search

- Matches literal substrings in a title or notes, never regular expressions and never across the title/notes boundary.
- Trims query edges; an empty/whitespace-only query leaves the current view/filter results unchanged. Internal spaces are significant.
- Uses Unicode NFC normalization and locale-independent uppercase/lowercase normalization. This supports canonical accent forms, case variants, Armenian case expansion, Greek sigma, and expansions such as Straße/STRASSE. Accents are preserved; résumé does not match resume. This is not transliteration, fuzzy search, stemming or language-specific tokenization.
- Recalculates as the controlled input changes. No library, network request, storage write, or artificial delay is needed.
- An explicit Clear search button clears only the query and restores input focus. Search results announce the count politely.

## Filters

All three filters combine with AND inside the selected view; they never broaden or override that view. Controls remain selected when switching views, and active values stay visible even if the panel is collapsed.

| Filter                              | Meaning                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------- |
| Status: All                         | No additional completion restriction                                        |
| Status: Incomplete / Completed      | Require the chosen Boolean state                                            |
| Priority: All / Low / Normal / High | No restriction, or exact priority                                           |
| Deadline: Any                       | No additional date restriction                                              |
| Deadline: Overdue                   | Incomplete and due before today                                             |
| Deadline: Today                     | Deadline equals today, with completion controlled separately by Status/view |
| Deadline: Upcoming                  | Deadline after today, with completion controlled separately by Status/view  |
| Deadline: No due date               | Deadline absent                                                             |

For example, Today + Completed yields no results, and All tasks + Completed + Overdue also yields no results. All tasks + Completed + Today can show tasks already completed with today's deadline, while the global Due today metric remains an incomplete-task count.

Reset filters changes only the three filter values; it preserves query, sort and view and focuses search. Clear search and filters in a no-results state resets query/filters but preserves sort/view. The no-results copy explains that other tasks may exist; it is distinct from a genuinely empty selected view.

## Sorting

Default: **Due date, earliest first**. All sorts operate on a copy.

| Choice                   | Primary ordering                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Due date, earliest first | Date ascending; undated tasks last, even after 9999-12-31                              |
| Priority, highest first  | High → Normal → Low                                                                    |
| Newest created           | Creation timestamp descending                                                          |
| Oldest created           | Creation timestamp ascending                                                           |
| Title, alphabetical      | Explicit English `Intl.Collator`, base sensitivity (case/accent-equivalent titles tie) |

All primary ties use creation timestamp ascending, then stable ID in code-unit order. This makes ties independent of incidental array input order. Newest/oldest ties naturally proceed directly to ID when creation timestamps match. Title collation uses the browser's Unicode/ICU implementation and is not customized per language.

All tasks is one sorted list including both completion states, so sorting governs the entire selected collection. Open tasks and Completed each have one list. Today always keeps Overdue before Due today; the selected sort is applied within each attention group. Empty groups are omitted.

## Workload, feedback and focus

The four summary metrics—Incomplete, Due today, Overdue, Completed—are labeled **Across your workspace** and ignore the current query/filters. Navigation counts also reflect full view membership. The toolbar separately reports `N of M tasks in [view]`, where M is that view before query/filters. There are no invented percentages or productivity statistics.

A successful editor save calls the existing persistence service first. Only an `ok` result triggers the contextual visibility notice. A task saved without a deadline in Today stays out of Today and is explicitly located in Open tasks/All tasks. Other saved tasks hidden by the selected view/query/filters receive an appropriate notice. Show all tasks resets the controls and opens All tasks. Default new-task deadlines remain empty.

Failed saves retain the existing storage message and draft. When a field is edited after failure, the message adds that the draft changed since the last attempt and must be saved again. Important failure information is not cleared just because the user types. The global banner labels the message as the last save attempt. Domain and persistence behavior are unchanged.

Native editor/delete dialogs keep their Phase 2 keyboard/focus guarantees. Clearing search, resetting filters, clearing no-results controls, and following the saved-task destination preserve a useful focus target. The search field, selects and filter button work with keyboard/touch without hover. Active controls use explicit labels, expanded-state semantics and visible focus styling.

## Visual integration

The approved brand, DM Sans, light/dark tokens, reminder art, sidebar, editor and task rows remain. The compact toolbar adds an always-visible search field, sort select and expandable Filters button. Filter details are initially collapsed. Mobile uses a deliberate two-column navigation grid for four views, a two-by-two summary, and stacked filter fields. Search/forms retain readable 16px mobile controls and 44px control heights.

The only row markup addition is `data-task-id`, enabling duplicate-title tests to verify deletion of the selected identity after sorting, rather than assuming insertion order is the visual order. Phase 2's screenshot-capture test retains its assertions but now writes its current-run captures to temporary test output. Historical Phase 1/2 PNGs are never overwritten. `npm run screenshots` captures Phase 3 evidence.

## Limits and scope

localStorage quota, origin/profile isolation, lack of backup, synchronous whole-document writes, and possible simultaneous-tab races remain as documented in Phase 2. Search is local linear scanning and sorting is local comparison sorting; the prior 2,000-task check remains, without an unlimited-scale claim. Controls reset on reload. English UI/collation and literal accent-preserving search are deliberate bounds.

No cloud/account/backend, projects/subtasks, calendar interface, recurring tasks, drag-and-drop, notifications, export/import, GitHub publication or deployment was added. Backup/restore remains mandatory before any future public deployment. Phase 4 requires explicit authorization.
