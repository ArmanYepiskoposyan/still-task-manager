# Phase 2 architecture

Historical Phase 2 documentation, independently approved. Current behavior and evidence are documented in [Phase 3 architecture](phase3-architecture.md), [verification](phase3-verification.md), and [visual review](phase3-visual-review.md).

## Data and rules

`src/domain/task.ts` defines a readonly Task and pure immutable command functions. IDs come from `crypto.randomUUID()` at the application boundary, never array positions. Titles may duplicate. New tasks default to Normal priority, incomplete, no deadline, no completion timestamp.

| Field         | Stored form and invariant                                                                   |
| ------------- | ------------------------------------------------------------------------------------------- |
| `id`          | Nonblank string, at most 128 code units, unique in the document; application-generated UUID |
| `title`       | Trimmed nonempty string, at most 200 UTF-16 code units                                      |
| `notes`       | Optional string, at most 5,000 UTF-16 code units; whitespace/newlines preserved             |
| `completed`   | Boolean                                                                                     |
| `priority`    | `Low`, `Normal`, or `High`                                                                  |
| `dueDate`     | Optional valid Gregorian `YYYY-MM-DD`, year 0001–9999; no timezone conversion               |
| `createdAt`   | Canonical UTC timestamp such as `2026-10-27T08:00:00.000Z`                                  |
| `updatedAt`   | Canonical UTC timestamp, never before creation                                              |
| `completedAt` | Required when complete, absent when open; between creation and last update                  |

Optional empty editor fields are normalized to absence. JSON omits undefined fields. Limits follow native input `maxLength` semantics (UTF-16 code units, so some emoji use two units). Runtime loading rejects invalid field types, dates, timestamps, duplicate IDs, and inconsistent completion fields. Unknown properties are ignored and not propagated into domain objects.

Editing preserves ID, creation time, and completion state. Unchanged normalized fields return the same Task; no timestamp or storage rewrite occurs. Completion/reopening are idempotent for an already-matching value. Real changes set `updatedAt`; completing sets `completedAt`, reopening removes it. A device clock rollback clamps the new timestamp to the previous modification timestamp so chronology remains valid. Timestamps are device-derived, not authoritative server time.

`lib/dates/calendar.ts` treats calendar deadlines separately from UTC instants, validates leap years, and formats using local noon to avoid UTC date shifts. The page date uses local year/month/day and refreshes at local midnight, window focus, and visibility changes. The clock is controlled in tests; no fixed date is shipped in the app.

## State and operation flow

1. The editor owns an unsaved draft and validates it before submitting.
2. The context service generates time/ID as needed and invokes a pure domain command on the current committed snapshot.
3. The repository re-reads and validates the stored document, checks that it still matches the snapshot, validates/serializes the proposed collection, then calls `setItem`.
4. Only a successful write publishes the new snapshot through the pure reducer. Derived lists and counts update together; a live status announces the saved operation.
5. On failure, the prior task snapshot stays visible. The service returns the error to the dialog and reducer. Forms remain open with their input; delete confirmation remains open and says the task was not deleted.

The reducer contains no storage effects. The provider keeps a synchronous ref pointing at the same committed state so rapid commands before React's next render cannot reuse a stale snapshot. This is not a separately editable task collection. Each editor has a submit guard to prevent duplicate creation from repeated events while closing. A failed submission releases the guard for retry.

Simple navigation uses Open tasks / All tasks / Completed, preserving the Phase 1 sidebar/top tabs. Lists preserve insertion order and use stable IDs as React keys. There is no misleading Today grouping or arbitrary overdue total. View and open-dialog state are session-only; tasks/theme persist.

## Storage contract

Key: `still.tasks`.

```json
{
  "version": 1,
  "tasks": [
    {
      "id": "02c6634a-bc64-4a5b-8200-5b36b47c7779",
      "title": "A thoughtful next step",
      "completed": false,
      "priority": "Normal",
      "createdAt": "2026-10-27T08:00:00.000Z",
      "updatedAt": "2026-10-27T08:00:00.000Z"
    }
  ]
}
```

This is a documentation example, never a production fixture. Version 1 is the first real storage format; Phase 1 stored no tasks. There is no migration for unknown versions. The dependency-injected StoragePort is intentionally limited to `getItem`/`setItem`; the repository has no delete/reset operation.

| Condition                          | Behavior                                                           |
| ---------------------------------- | ------------------------------------------------------------------ |
| Missing key                        | Empty workspace, without an initial write                          |
| Valid version 1                    | Load validated known fields                                        |
| Malformed JSON or task invariants  | Error view; raw data left untouched; mutation controls disabled    |
| Unknown integer version            | Unsupported-version error; no downgrade or overwrite               |
| Storage getter/read denied         | Unavailable message and real retry                                 |
| `setItem` quota/security failure   | No published mutation; input preserved; actionable failure message |
| Stored value differs from snapshot | Conflict error; reload required before mutation                    |
| Explicit retry/reload              | Read again and replace state only if valid; never clear storage    |

The browser's `storage` event warns about another tab. The prewrite comparison prevents ordinary stale-tab overwrites, but localStorage's separate read and write are not an atomic transaction. Simultaneous writes from two tabs remain a documented limitation; edit in one tab. A localStorage return value confirms the browser accepted the write, not a durable cloud backup.

Writes are synchronous whole-document serialization. Browser quotas and storage availability vary. Private sessions, clearing data, origin changes, eviction, and device loss may remove or isolate data. Application code does not encrypt tasks. There is no backend, network synchronization, export/import, or disaster recovery workflow in Phase 2.

## Themes and accessible interactions

`still.theme` stores `light`, `dark`, or `system`. The external `public/theme-init.js` script runs in the head before the bundled application and styles finish loading. It reads the explicit preference safely and resolves System from `matchMedia`; the React hook follows later OS changes. If saving a theme fails, the selected appearance works for the session with an explicit persistence warning.

Native dialogs lock background scrolling, focus the title (editor) or Keep task (delete confirmation), contain Tab/Shift+Tab, and support Escape. Focus restoration runs after the dialog/removed row is committed: it returns to the opener or the stable New task control when that opener was deleted. Completion controls are real labeled checkboxes; when a view removes a toggled row, focus moves to a neighbor or New task. Validation is associated with fields and announced; storage errors use alerts. No confirmations are added to create/edit/complete operations.

The approved typography, neutral/indigo/sage palette, reminder graphic, navigation layout, and responsive modal behavior remain. Important task metadata is 12px; mobile form controls remain 16px. Necessary additions are delete controls/confirmation, real error feedback, and truthful view labels/counts. Phase 3 functionality remains deferred.
