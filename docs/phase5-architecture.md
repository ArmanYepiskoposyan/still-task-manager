# Phase 5 — architecture and data safety

Date: 2026-11-02. Phase 5 extends the independently approved Phase 4 application. It remains a browser-local React/TypeScript application, with no new dependency, backend, account, cloud synchronization or deployment. Historical phase documents describe their respective versions; this document is the current contract.

## Model and projects

`Task` retains every previous field and adds optional `projectId`. A `Project` has `id`, `name`, `createdAt`, and `updatedAt`. IDs are stable strings of 1–128 characters with nonblank content; application-created IDs use `crypto.randomUUID()`. Task and project IDs have separate namespaces; each collection rejects duplicates. A task can reference exactly one existing project or be unassigned. Task titles, notes, priority, calendar dates and timestamp invariants retain the Phase 2 validation rules.

Project names are trimmed and limited to 80 UTF-16 code units. Names must be unique after the same NFC and case normalization used by search; accents are preserved. `Home` and `home` conflict, as do canonically equivalent Unicode strings. Names are plain text. Renaming preserves identity and creation time; no-op renaming does not advance modification time. A backwards device clock cannot move `updatedAt` before its previous value.

Deleting a project requires a dialog stating how many tasks become unassigned and that none will be deleted. The project removal and task reference removal are persisted in **one document write**. Task IDs, content, completion state and timestamps are preserved. This organizational cleanup intentionally does not rewrite task timestamps. A failed write leaves both collections unchanged. Deleting tasks never implicitly deletes projects.

The compact Projects selector lists all projects and total task counts, including completed tasks, independent of search and filters. The selected project has edit/delete controls. New tasks created while browsing a project default to that project. The task editor supports assignment, reassignment and Unassigned. Project and Unassigned views include both completed and incomplete tasks; status filters can narrow them. Projects are flat, with no nested structure, permissions or collaboration.

## Schema and migration

The existing `still.tasks` key now stores:

```json
{
  "version": 2,
  "tasks": [],
  "projects": []
}
```

`deserializeTasks` is the single runtime validator for storage and imported workspace documents. It validates the full collection, task and project fields, timestamp chronology, duplicate IDs, normalized duplicate project names and all project references. Known-field projection discards unknown fields and avoids propagating prototype-looking properties. No imported HTML is rendered or executed.

Reading a valid version-1 document creates an in-memory snapshot with an empty project collection and unassigned tasks. All supported task fields, IDs and timestamps survive. Version 1 never supported project information, so unknown legacy `projectId`/`projects` fields are not adopted. **Reading performs no write.** The original raw string, including its whitespace and field order, remains the expected conflict token. The next successful mutation writes a complete version-2 document. A no-op merely rechecks storage and need not migrate it. No key is cleared, and there is no destructive startup reset.

Missing storage is an empty workspace. Corrupt, invalid or unsupported future documents block ordinary mutations and remain untouched. There is no guess-based repair. A checked-in synthetic [version-1 fixture](../tests/fixtures/phase5-version1.json) was produced through the approved Phase 4 application: task creation, one edit and one completion. Tests verify that its distinct timestamps and fields survive the upgrade.

Serialization uses a fixed property order for each document, task and project. Collection order is preserved; view sorting never changes saved order. The serializer validates before projection and validates the resulting JSON again. Equivalent data round-trips deterministically.

## Persistence and conflict handling

The existing reducer/context architecture remains. A synchronous cursor points to the last committed snapshot, preventing rapid sequential actions from using stale React closures. Task and project commands compute immutable candidate collections. The repository validates the candidate, rereads storage, checks the expected raw snapshot and writes; only a successful write can publish state. Failure retains the last committed snapshot and the open form draft. Even no-op commands recheck the stored document.

Ordinary `commit` also validates the current stored document before writing. `replace` is a distinct, explicitly confirmed recovery path: it validates the entire candidate and compares the current raw string against the string captured when the backup dialog opened. It may replace corruption or unsupported data only through this deliberate workflow. Unavailable storage never supplies a usable replacement token.

These checks detect an intervening tab change, including changes made after import preview. Relevant localStorage events warn; sessionStorage and unrelated keys are ignored. **localStorage has no atomic compare-and-swap**: a truly simultaneous write from another tab between the read and write can still race. Use one editing tab. A single `setItem` replaces both collections together; this is not a claim of cross-tab transaction isolation.

## Backup format and restore

The UTF-8 JSON export envelope is:

```json
{
  "format": "still-backup",
  "version": 1,
  "exportedAt": "2026-11-02T12:00:00.000Z",
  "data": { "version": 2, "tasks": [], "projects": [] }
}
```

Backup envelope version and workspace schema version are independent. Exports include all validated saved tasks and projects, plus a canonical UTC export timestamp. They exclude theme, unrelated localStorage keys, browser state and unsaved drafts. Export rereads the repository and checks that it still matches the committed snapshot. Filenames are `still-backup-YYYY-MM-DD.json`, using the UTC export date. Blob downloads use UTF-8 JSON and revoke the object URL after a delay for browser download handling. Download initiation is reported honestly; the app cannot guarantee where a browser or user ultimately saves the file.

Accepted imports are this version-1 backup envelope containing a supported workspace, or a bare version-1/version-2 workspace document. This supports older stored-document exports, not arbitrary third-party files. File extension/MIME are hints only; content is validated. The maximum file size is **10 MiB (10,485,760 bytes)**, checked before FileReader reads the file and again against the UTF-8 encoded text before JSON parsing. Normal exports use the same byte bound; an oversized workspace can still be downloaded as raw recovery data. Browser storage quota may be substantially lower than the import limit.

The restore workflow:

1. Open Backup & restore; capture the exact current raw document or report inaccessible storage.
2. Choose a file. Fully parse and validate it without any write or partial import. A later file selection invalidates an earlier asynchronous result; closing the panel invalidates pending results too.
3. Show filename, task/project counts, and an explicit warning that all current tasks and projects will be replaced. Focus the preview heading.
4. Require a separate acknowledgement checkbox and **Replace workspace** action. Nothing is silently merged. A synchronous submission guard prevents duplicate confirmation actions.
5. Validate and compare again at persistence, write the whole document once, then publish success. Navigate to All tasks with cleared search/filters so restored data is visible.
6. On failure keep the old collections and preview; uncheck acknowledgement. Quota/blocked writes can be retried after resolution with fresh confirmation. A conflict requires closing the panel and reloading/reopening so the new document can be reviewed.

No undo history is promised. Users are told to export a copy before replacement. There is no separate reset button; an explicitly confirmed valid empty workspace file can replace a collection.

## Recovery and privacy

When data is corrupt or uses a future version, New task and project changes are blocked. Retry remains available. Backup & restore remains reachable, with normal export disabled and a warning to preserve the raw document first. **Download raw stored document** downloads the exact captured string, without parsing, canonicalizing or repairing it, as `still-recovery-YYYY-MM-DD.txt`. This is the document captured when the panel opened, not a live view of later tab changes. The panel must be reopened to capture newer storage. Blocked reads disable both raw download and import until access is restored.

Backups and localStorage are unencrypted. Files contain task/project text and should be kept privately. No data is sent to a server. Browser data clearing, private-mode cleanup, quota/eviction or device loss can remove the local copy. Origin/profile changes create separate workspaces. Backups must be downloaded deliberately; there is no automatic backup or synchronization.

## Upcoming and statistics

Upcoming includes only incomplete tasks whose date-only `dueDate` is lexicographically greater than the current local `YYYY-MM-DD`. Today remains separate and includes incomplete overdue/today tasks. Upcoming groups are chronological by date; the selected sort applies **within each date group**, with the same stable tie rules as other views. A map buckets matching tasks once, avoiding a full scan for every date. Search and all existing filters narrow the view without changing the stored data. Completing a task removes it from Upcoming, and editing a date can move it between groups/views. Midnight and focus/visibility updates use the existing local-date hook. Timezone tests cover UTC+14 and the Los Angeles boundary after the daylight-saving transition.

The four existing global metrics remain: Incomplete, Due today, Overdue and Completed. The summary introduction adds total records and completed today. `completedToday` counts currently completed records whose `completedAt` instant converts to the current local date. It is **not an event history**: reopening or deleting a task removes it from that count. Multiple completion/reopen cycles do not accumulate a productivity score. Project counts include all statuses. Search/filter results do not alter global or project totals.

## Keyboard and interface

Existing warm neutral/indigo tokens, DM Sans, rows, summaries, themes and responsive breakpoints remain. The main navigation gains Upcoming and Unassigned; a native project selector keeps navigation bounded even with many projects. Desktop sidebars can scroll on short windows. Mobile navigation retains two columns. Backup, project and shortcut dialogs reuse the native modal/focus infrastructure. Escape now closes through React's cancellation handler immediately, avoiding a stale-dialog interval before a subsequent shortcut; regression tests retain modal focus wrapping and opener restoration.

Shortcuts: **N** opens New task; **/** focuses search; **?** opens help. They require no Control/Command/Alt modifiers, do not activate on repeats, composition, form fields or editable content, and are suspended while a modal is open. Keyboard shortcuts are optional and can be disabled from discoverable help for the current session, supporting character-key shortcut accessibility. The preference resets on reload. Native browser/system modifier shortcuts remain untouched; actual keyboard layouts may produce different character keys. There are no destructive shortcuts.

## Limits and verification

No new package or state-management library was added. Whole-document synchronous validation/serialization and full DOM rendering remain deliberate limits; large collections can still incur noticeable latency. The performance report measures 100/1,000/3,000 tasks with 3/20/50 projects and paired approved-Phase-4 renders. Timings include browser automation and are not an INP, capacity or speed guarantee.

See [verification](phase5-verification.md) for commands, precise results and limitations, and [visual review](phase5-visual-review.md) for actual screenshot evidence. No account, backend, synchronization, recurring tasks, notifications, nested projects, subtasks, full calendar, publication or deployment was implemented. Phase 6 is not started.
