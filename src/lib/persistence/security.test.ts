import { describe, expect, it, vi } from 'vitest'
import { createTask } from '../../domain/task'
import { createTaskRepository, deserializeTasks, serializeTasks } from './taskRepository'
const task = createTask(
  {
    title: '<img src=x onerror=alert(1)>',
    notes: '<script>globalThis.injected=true</script>\u202e🌿',
    priority: 'Normal',
    dueDate: '2028-02-29',
  },
  'synthetic',
  '2026-10-27T00:00:00.000Z',
)
describe('untrusted persisted structures', () => {
  it.each([
    null,
    true,
    [],
    { id: 'only' },
    { ...task, title: {} },
    { ...task, notes: ['text'] },
    { ...task, dueDate: 42 },
    { ...task, priority: { value: 'High' } },
    { ...task, id: 'x'.repeat(129) },
  ])('rejects invalid task structures without a write: %j', (value) => {
    const raw = JSON.stringify({ version: 1, tasks: [value] })
    const storage = { getItem: () => raw, setItem: vi.fn() }
    const repo = createTaskRepository(() => storage)
    expect(() => repo.read()).toThrow()
    expect(() => repo.commit([], raw)).toThrow()
    expect(storage.setItem).not.toHaveBeenCalled()
  })
  it('drops unknown and prototype-like fields while retaining literal text', () => {
    const raw = JSON.stringify({
      version: 1,
      tasks: [{ ...task, constructor: { polluted: true }, extra: 'ignored' }],
    }).replace('"extra":"ignored"', '"__proto__":{"polluted":true},"extra":"ignored"')
    const loaded = deserializeTasks(raw).tasks[0]
    expect(loaded).toEqual(task)
    expect(Object.hasOwn(loaded!, '__proto__')).toBe(false)
    expect(Object.hasOwn(loaded!, 'constructor')).toBe(false)
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false)
    expect(loaded?.title).toBe(task.title)
  })
  it('serializes validated snapshots deterministically through repeated round trips', () => {
    const first = serializeTasks([task])
    let raw = first
    for (let i = 0; i < 10; i++) raw = serializeTasks(deserializeTasks(raw).tasks)
    expect(raw).toBe(first)
  })
})
