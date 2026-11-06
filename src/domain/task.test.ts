import { describe, expect, it } from 'vitest'
import {
  applyTaskCommand,
  createTask,
  editTask,
  isTask,
  setCompletion,
  validateDraft,
} from './task'
import type { TaskDraft } from './task'
const initial = '2026-10-27T08:00:00.000Z'
const later = '2026-10-27T09:00:00.000Z'
const draft: TaskDraft = {
  title: '  A thoughtful task  ',
  notes: '',
  priority: 'Normal',
  dueDate: '',
}
const task = () => createTask(draft, 'unique-id', initial)

describe('task validation', () => {
  it.each(['', ' ', '\t\n', '\u2003'])('rejects blank title %j', (title) => {
    expect(validateDraft({ ...draft, title }).title).toBeDefined()
  })
  it('accepts 200 title characters and rejects 201', () => {
    expect(validateDraft({ ...draft, title: 'a'.repeat(200) })).toEqual({})
    expect(validateDraft({ ...draft, title: 'a'.repeat(201) }).title).toBeDefined()
  })
  it('accepts 5000 note characters and rejects 5001', () => {
    expect(validateDraft({ ...draft, notes: 'a'.repeat(5000) })).toEqual({})
    expect(validateDraft({ ...draft, notes: 'a'.repeat(5001) }).notes).toBeDefined()
  })
  it('preserves Unicode and multiline notes while trimming the title', () => {
    const t = createTask(
      { ...draft, title: '  Բարև 🌿  ', notes: ' first\nsecond ' },
      'unicode',
      initial,
    )
    expect(t.title).toBe('Բարև 🌿')
    expect(t.notes).toBe(' first\nsecond ')
  })
  it.each(['2026-02-29', '2026-04-31', '2026-13-01', '27/10/2026', '0000-01-01'])(
    'rejects invalid due date %s',
    (dueDate) => {
      expect(validateDraft({ ...draft, dueDate }).dueDate).toBeDefined()
    },
  )
  it('accepts a leap-day deadline', () => {
    expect(validateDraft({ ...draft, dueDate: '2028-02-29' })).toEqual({})
  })
  it('rejects an invalid priority at runtime', () => {
    expect(
      validateDraft({ ...draft, priority: 'Urgent' as TaskDraft['priority'] }).priority,
    ).toBeDefined()
  })
  it('does not create an invalid task', () => {
    expect(() => createTask({ ...draft, title: ' ' }, 'id', initial)).toThrow()
  })
})
describe('immutable task lifecycle', () => {
  it('creates an incomplete task with identity, timestamps and optional fields absent', () => {
    expect(task()).toEqual({
      id: 'unique-id',
      title: 'A thoughtful task',
      notes: undefined,
      priority: 'Normal',
      dueDate: undefined,
      completed: false,
      createdAt: initial,
      updatedAt: initial,
    })
  })
  it('supports duplicate titles with different IDs', () => {
    const tasks = applyTaskCommand([task()], { type: 'create', draft, id: 'other-id', now: later })
    expect(tasks.map((t) => t.id)).toEqual(['unique-id', 'other-id'])
    expect(tasks[0]?.title).toBe(tasks[1]?.title)
  })
  it('rejects identifier collisions', () => {
    expect(() =>
      applyTaskCommand([task()], { type: 'create', draft, id: 'unique-id', now: later }),
    ).toThrow(/identifier/)
  })
  it('preserves ID and creation date when editing', () => {
    const original = Object.freeze(task())
    const edited = editTask(
      original,
      { ...draft, title: 'Changed', notes: 'More detail', dueDate: '2026-11-02', priority: 'High' },
      later,
    )
    expect(edited).toMatchObject({
      id: original.id,
      createdAt: initial,
      updatedAt: later,
      title: 'Changed',
      notes: 'More detail',
      priority: 'High',
      dueDate: '2026-11-02',
    })
    expect(original.title).toBe('A thoughtful task')
  })
  it('does not change modification time for a no-op edit', () => {
    const original = task()
    expect(editTask(original, draft, later)).toBe(original)
  })
  it('removes notes and deadline when cleared', () => {
    const withDetails = createTask(
      { ...draft, notes: 'note', dueDate: '2026-11-02' },
      'id',
      initial,
    )
    const edited = editTask(withDetails, draft, later)
    expect(edited.notes).toBeUndefined()
    expect(edited.dueDate).toBeUndefined()
  })
  it('completes and reopens repeatedly without changing identity or content', () => {
    const original = task()
    let current = original
    for (let i = 0; i < 5; i++) {
      current = setCompletion(current, true, later)
      expect(current.completedAt).toBe(later)
      expect(isTask(current)).toBe(true)
      current = setCompletion(current, false, later)
      expect(current.completedAt).toBeUndefined()
      expect(current.id).toBe(original.id)
      expect(current.title).toBe(original.title)
    }
  })
  it('retains completion timestamp when editing a completed task', () => {
    const completed = setCompletion(task(), true, later)
    expect(
      editTask(completed, { ...draft, title: 'Edited completed' }, '2026-10-28T00:00:00.000Z')
        .completedAt,
    ).toBe(later)
  })
  it('returns the same task for idempotent completion', () => {
    const original = task()
    expect(setCompletion(original, false, later)).toBe(original)
  })
  it('handles device clock rollback without invalid timestamp order', () => {
    expect(
      editTask(task(), { ...draft, title: 'changed' }, '2026-10-26T01:00:00.000Z').updatedAt,
    ).toBe(initial)
  })
  it('deletes only the selected ID, even for duplicate completed titles', () => {
    const original = Object.freeze([
      setCompletion(task(), true, later),
      createTask(draft, 'other', initial),
    ])
    expect(
      applyTaskCommand(original, { type: 'delete', id: 'unique-id' }).map((t) => t.id),
    ).toEqual(['other'])
    expect(original).toHaveLength(2)
  })
  it.each(['edit', 'complete', 'delete'] as const)('rejects %s for a missing ID', (type) => {
    expect(() =>
      applyTaskCommand([], { type, id: 'missing', draft, completed: true, now: later }),
    ).toThrow(/no longer exists/)
  })
  it('updates one task in a large collection without mutating neighbors', () => {
    const many = Array.from({ length: 2000 }, (_, i) => createTask(draft, `id-${i}`, initial))
    const updated = applyTaskCommand(many, {
      type: 'complete',
      id: 'id-1000',
      completed: true,
      now: later,
    })
    expect(updated).toHaveLength(2000)
    expect(updated[1000]?.completed).toBe(true)
    expect(updated[999]).toBe(many[999])
    expect(many[1000]?.completed).toBe(false)
  })
})
