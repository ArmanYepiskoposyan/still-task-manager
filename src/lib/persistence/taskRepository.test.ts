import { describe, expect, it, vi } from 'vitest'
import { createTask } from '../../domain/task'
import { createTaskRepository, deserializeTasks, serializeTasks, TASKS_KEY } from './taskRepository'
const task = createTask(
  { title: 'A saved task', notes: 'Hello 🌿', priority: 'Normal', dueDate: '2028-02-29' },
  'id',
  '2026-10-27T08:00:00.000Z',
)
const raw = serializeTasks([task])
const envelope = (value: unknown) => JSON.stringify({ version: 1, tasks: value })
describe('versioned storage validation', () => {
  it('treats missing data as a new workspace without a write', () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() }
    expect(createTaskRepository(() => storage).read()).toEqual({
      tasks: [],
      projects: [],
      raw: null,
    })
    expect(storage.setItem).not.toHaveBeenCalled()
  })
  it('round trips Unicode, optional fields and an empty collection', () => {
    expect(deserializeTasks(raw).tasks).toEqual([task])
    expect(deserializeTasks(serializeTasks([])).tasks).toEqual([])
  })
  it.each([
    '',
    '{',
    'null',
    '[]',
    '42',
    '{"tasks":[]}',
    '{"version":"1","tasks":[]}',
    '{"version":1}',
  ])('rejects corrupt document %s', (value) => {
    expect(() => deserializeTasks(value)).toThrow()
  })
  it.each([0, 3, 100])('rejects unsupported version %s', (version) => {
    expect(() => deserializeTasks(JSON.stringify({ version, tasks: [] }))).toThrow(/unsupported/)
  })
  it.each([
    { id: '' },
    { title: ' ' },
    { title: ' untrimmed ' },
    { title: 'x'.repeat(201) },
    { notes: 'x'.repeat(5001) },
    { notes: null },
    { priority: 'Urgent' },
    { completed: 'false' },
    { dueDate: '2026-02-29' },
    { dueDate: null },
    { createdAt: 'yesterday' },
    { updatedAt: '2026-10-26T00:00:00.000Z' },
    { completed: true },
    { completedAt: '2026-10-27T08:00:00.000Z' },
    { createdAt: '2026-02-30T08:00:00.000Z' },
  ])('rejects an invalid persisted task (%j)', (change) => {
    expect(() => deserializeTasks(envelope([{ ...task, ...change }]))).toThrow(/invalid tasks/)
  })
  it('rejects duplicate IDs', () => {
    expect(() => deserializeTasks(envelope([task, task]))).toThrow(/invalid tasks/)
  })
  it('rejects inconsistent completion chronology', () => {
    expect(() =>
      deserializeTasks(
        envelope([{ ...task, completed: true, completedAt: '2026-10-28T00:00:00.000Z' }]),
      ),
    ).toThrow()
  })
  it('round trips large valid collections', () => {
    const many = Array.from({ length: 2000 }, (_, i) => ({ ...task, id: `id-${i}` }))
    expect(deserializeTasks(serializeTasks(many)).tasks).toEqual(many)
  })
})
describe('repository failures and write discipline', () => {
  it('commits only after writing the versioned document', () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() }
    const next = createTaskRepository(() => storage).commit([task], null)
    expect(storage.setItem).toHaveBeenCalledWith(TASKS_KEY, raw)
    expect(next.raw).toBe(raw)
  })
  it('reports storage getter failures', () => {
    const repo = createTaskRepository(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(() => repo.read()).toThrow(/unavailable/)
    expect(() => repo.commit([task], null)).toThrow(/unavailable/)
  })
  it('reports getItem failures', () => {
    const repo = createTaskRepository(() => ({
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: vi.fn(),
    }))
    expect(() => repo.read()).toThrow(/unavailable/)
  })
  it.each(['QuotaExceededError', 'SecurityError'])(
    'does not return success when writes fail: %s',
    (name) => {
      const storage = {
        getItem: () => raw,
        setItem: () => {
          throw new DOMException('blocked', name)
        },
      }
      expect(() => createTaskRepository(() => storage).commit([], raw)).toThrow(/wasn’t saved/)
      expect(storage.getItem()).toBe(raw)
    },
  )
  it.each(['broken', '{"version":9,"tasks":[]}'])(
    'never overwrites unreadable storage: %s',
    (stored) => {
      const storage = { getItem: () => stored, setItem: vi.fn() }
      const repo = createTaskRepository(() => storage)
      expect(() => repo.read()).toThrow()
      expect(() => repo.commit([], stored)).toThrow()
      expect(storage.setItem).not.toHaveBeenCalled()
    },
  )
  it('blocks stale-tab writes and preserves the external document', () => {
    const storage = { getItem: () => raw, setItem: vi.fn() }
    expect(() => createTaskRepository(() => storage).commit([], null)).toThrow(/another tab/)
    expect(storage.setItem).not.toHaveBeenCalled()
  })
  it('retries a transient failure with the original snapshot', () => {
    const write = vi.fn().mockImplementationOnce(() => {
      throw new Error('quota')
    })
    const repo = createTaskRepository(() => ({ getItem: () => null, setItem: write }))
    expect(() => repo.commit([task], null)).toThrow()
    expect(repo.commit([task], null).tasks).toEqual([task])
  })
})
