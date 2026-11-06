import approvedVersion1 from '../../../tests/fixtures/phase5-version1.json' with { type: 'json' }
import { describe, expect, it, vi } from 'vitest'
import { createTaskRepository, deserializeTasks, serializeTasks } from './taskRepository'
import { createBackup, MAX_BACKUP_BYTES, parseBackup, readBackupFile } from './backup'
import { createTask } from '../../domain/task'
const at = '2026-11-02T08:00:00.000Z'
const task = createTask(
  {
    title: 'Բարև 🌿 <img onerror=alert(1)>',
    notes: 'line\nline',
    priority: 'High',
    dueDate: '2028-02-29',
  },
  't1',
  at,
)
const project = { id: 'p1', name: 'Work', createdAt: at, updatedAt: at }
const data = { tasks: [{ ...task, projectId: 'p1' }], projects: [project] }
const legacy = JSON.stringify({
  version: 1,
  tasks: [task, { ...task, id: 'done', completed: true, completedAt: at }],
})
describe('schema migration and runtime validation', () => {
  it('migrates every v1 field in memory, retains raw text, and only writes v2 on a successful commit', () => {
    let raw = legacy
    const storage = {
      getItem: () => raw,
      setItem: vi.fn((_key: string, value: string) => {
        raw = value
      }),
    }
    const repo = createTaskRepository(() => storage)
    const snap = repo.read()
    expect(snap.raw).toBe(legacy)
    expect(snap.tasks).toEqual(JSON.parse(legacy).tasks)
    expect(snap.projects).toEqual([])
    expect(storage.setItem).not.toHaveBeenCalled()
    const saved = repo.commit([...snap.tasks, { ...task, id: 'new' }], snap.raw, snap.projects)
    expect(JSON.parse(raw).version).toBe(2)
    expect(saved.tasks.slice(0, 2)).toEqual(snap.tasks)
  })
  it('does not adopt unsupported legacy project metadata', () => {
    expect(
      deserializeTasks(
        JSON.stringify({
          version: 1,
          tasks: [{ ...task, projectId: 'unknown' }],
          projects: [project],
        }),
      ).tasks,
    ).toEqual([task])
  })
  it.each(['{', '{"version":1,"tasks":[{}]}', '{"version":3,"tasks":[],"projects":[]}'])(
    'preserves invalid or future data %s',
    (raw) => {
      const storage = { getItem: () => raw, setItem: vi.fn() }
      const repo = createTaskRepository(() => storage)
      expect(() => repo.read()).toThrow()
      expect(() => repo.commit([], raw, [])).toThrow()
      expect(storage.setItem).not.toHaveBeenCalled()
      expect(repo.readRaw()).toBe(raw)
    },
  )
  it.each([
    { tasks: [data.tasks[0], data.tasks[0]], projects: [project] },
    { tasks: data.tasks, projects: [] },
    { tasks: [], projects: [project, project] },
    { tasks: [], projects: [project, { ...project, id: 'p2', name: ' WORK ' }] },
    { tasks: [], projects: [project, { ...project, id: 'p2', name: 'work' }] },
    { tasks: [{ ...task, projectId: null }], projects: [] },
    { tasks: [], projects: [{ ...project, id: '' }] },
    { tasks: [], projects: [{ ...project, name: 'x'.repeat(81) }] },
    { tasks: [], projects: [{ ...project, updatedAt: '2026-11-01T00:00:00.000Z' }] },
    { tasks: [], projects: [{ ...project, createdAt: 'yesterday' }] },
    { tasks: [], projects: null },
  ])('rejects complete invalid v2 documents %#', (invalid) => {
    expect(() => deserializeTasks(JSON.stringify({ version: 2, ...invalid }))).toThrow()
  })
  it('serializes deterministically and strips unknown/prototype-looking fields', () => {
    const value = JSON.parse(
      JSON.stringify({ version: 2, ...data }).replace(
        '"name":"Work"',
        '"name":"Work","__proto__":{"polluted":true},"extra":"ignored"',
      ),
    )
    const loaded = deserializeTasks(JSON.stringify(value))
    const first = serializeTasks(loaded.tasks, loaded.projects)
    expect(first).not.toContain('__proto__')
    expect(first).not.toContain('extra')
    for (let i = 0; i < 10; i++) {
      const next = deserializeTasks(first)
      expect(serializeTasks(next.tasks, next.projects)).toBe(first)
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})
describe('backup and explicit replacement safety', () => {
  it('exports valid Unicode JSON, metadata and all data without preferences', () => {
    const text = createBackup(data, at)
    expect(JSON.parse(text)).toEqual({
      format: 'still-backup',
      version: 1,
      exportedAt: at,
      data: { version: 2, ...data },
    })
    expect(parseBackup(text)).toEqual(data)
    expect(text).not.toContain('theme')
    expect(parseBackup(legacy).tasks).toHaveLength(2)
    expect(parseBackup(serializeTasks(data.tasks, data.projects))).toEqual(data)
  })
  it.each([
    '',
    '{',
    'null',
    '[]',
    '{"format":"other","version":1}',
    '{"format":"still-backup","version":2}',
    '{"format":"still-backup","version":1,"exportedAt":"yesterday"}',
    '{"format":"still-backup","version":1,"exportedAt":"2026-11-02T08:00:00.000Z"}',
  ])('rejects malformed or unsupported backups %s', (text) => {
    expect(() => parseBackup(text)).toThrow()
  })
  it('enforces byte size before file reading, and also bounds direct text parsing', async () => {
    const file = new File([new Uint8Array(MAX_BACKUP_BYTES + 1)], 'large.json')
    const spy = vi.spyOn(FileReader.prototype, 'readAsText')
    await expect(readBackupFile(file)).rejects.toThrow(/10 MiB/)
    expect(spy).not.toHaveBeenCalled()
    expect(() => parseBackup('🌿'.repeat(MAX_BACKUP_BYTES / 4 + 1))).toThrow(/10 MiB/)
  })
  it('reads a selected UTF-8 file and rejects bad contents regardless of extension', async () => {
    expect(await readBackupFile(new File([createBackup(data, at)], 'copy.json'))).toEqual(data)
    await expect(readBackupFile(new File(['not JSON'], 'copy.json'))).rejects.toThrow(/valid JSON/)
  })
  it('replaces atomically only after one successful write, including explicit corruption recovery', () => {
    let raw = 'broken original'
    const writes = vi.fn((_key: string, value: string) => {
      expect(raw).toBe('broken original')
      raw = value
    })
    const repo = createTaskRepository(() => ({ getItem: () => raw, setItem: writes }))
    expect(repo.replace(data, 'broken original').tasks).toEqual(data.tasks)
    expect(writes).toHaveBeenCalledTimes(1)
    expect(deserializeTasks(raw).projects).toEqual(data.projects)
  })
  it.each(['QuotaExceededError', 'SecurityError'])(
    'retains exact raw data on failed replacement: %s',
    (name) => {
      const raw = legacy
      const repo = createTaskRepository(() => ({
        getItem: () => raw,
        setItem: () => {
          throw new DOMException('blocked', name)
        },
      }))
      expect(() => repo.replace(data, raw)).toThrow(/wasn’t saved/)
      expect(repo.readRaw()).toBe(raw)
    },
  )
  it('refuses external changes and invalid replacement before any write', () => {
    const write = vi.fn()
    const repo = createTaskRepository(() => ({ getItem: () => legacy, setItem: write }))
    expect(() => repo.replace(data, null)).toThrow(/another tab/)
    expect(() => repo.replace({ ...data, projects: [] }, legacy)).toThrow(/references/)
    expect(write).not.toHaveBeenCalled()
  })
})

it('preserves the authentic approved Phase 4 fixture including distinct edit/completion times', () => {
  const raw = JSON.stringify(approvedVersion1)
  const snapshot = deserializeTasks(raw)
  expect(snapshot.raw).toBe(raw)
  expect(snapshot.projects).toEqual([])
  expect(snapshot.tasks).toEqual(approvedVersion1.tasks)
  expect(snapshot.tasks[0]!.updatedAt).not.toBe(snapshot.tasks[0]!.createdAt)
  expect(snapshot.tasks[1]!.completedAt).not.toBe(snapshot.tasks[1]!.createdAt)
  const upgraded = deserializeTasks(serializeTasks(snapshot.tasks, snapshot.projects))
  expect(upgraded.tasks).toEqual(approvedVersion1.tasks)
  expect(JSON.parse(upgraded.raw!).version).toBe(2)
})
