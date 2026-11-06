import { describe, expect, it } from 'vitest'
import { applyProjectCommand, projectCounts, projectName } from './project'
import type { WorkspaceData } from './project'
import { createTask, editTask } from './task'
import { completedToday, defaultSelection, selectTasks } from './taskSelection'
const at = '2026-11-02T08:00:00.000Z'
const task = createTask(
  { title: 'Բարև <script>literal</script>', notes: '🌿', priority: 'High', dueDate: '2026-11-03' },
  'task',
  at,
)
const empty: WorkspaceData = { tasks: [task], projects: [] }
const withProject = () =>
  applyProjectCommand(empty, { type: 'create', id: 'p1', name: '  Garden 🌿 ', now: at })
describe('project domain', () => {
  it('creates trimmed names with stable IDs and rejects duplicate identifiers', () => {
    const data = withProject()
    expect(data.projects[0]).toEqual({ id: 'p1', name: 'Garden 🌿', createdAt: at, updatedAt: at })
    expect(() =>
      applyProjectCommand(data, { type: 'create', id: 'p1', name: 'Other', now: at }),
    ).toThrow(/identifier/)
    expect(empty.projects).toEqual([])
  })
  it.each(['', '  ', 'x'.repeat(81)])('rejects invalid names %s', (name) => {
    expect(() => projectName(name, [])).toThrow(/1–80/)
  })
  it.each(['GARDEN 🌿', ' garden 🌿 '])('rejects normalized duplicate %s', (name) => {
    expect(() => projectName(name, withProject().projects)).toThrow(/already exists/)
  })
  it('renames without changing identity, clamps backwards clocks, and preserves no-ops', () => {
    const data = withProject()
    expect(
      applyProjectCommand(data, { type: 'rename', id: 'p1', name: 'Garden 🌿', now: at }),
    ).toBe(data)
    const renamed = applyProjectCommand(data, {
      type: 'rename',
      id: 'p1',
      name: 'Home',
      now: '2026-11-01T00:00:00.000Z',
    })
    expect(renamed.projects[0]).toEqual({ ...data.projects[0], name: 'Home' })
  })
  it('assigns, reassigns and removes a task project without losing other fields', () => {
    const draft = {
      title: task.title,
      notes: task.notes!,
      priority: task.priority,
      dueDate: task.dueDate!,
      projectId: 'p1',
    }
    const assigned = editTask(task, draft, at)
    expect(assigned).toEqual({ ...task, projectId: 'p1' })
    expect(editTask(assigned, { ...draft, projectId: 'p2' }, at).projectId).toBe('p2')
    expect(editTask(assigned, { ...draft, projectId: '' }, at)).toEqual(task)
  })
  it('deletes a project atomically without deleting tasks or changing historical timestamps', () => {
    const data = {
      ...withProject(),
      tasks: [
        { ...task, projectId: 'p1' },
        { ...task, id: 'other' },
      ],
    }
    const next = applyProjectCommand(data, { type: 'delete', id: 'p1' })
    expect(next.projects).toEqual([])
    expect(next.tasks).toEqual([task, { ...task, id: 'other' }])
    expect(data.tasks[0]?.projectId).toBe('p1')
    expect(() => applyProjectCommand(next, { type: 'delete', id: 'p1' })).toThrow(
      /no longer exists/,
    )
  })
  it('counts all project tasks including completed and safely handles special-looking IDs', () => {
    const tasks = [
      { ...task, projectId: '__proto__' },
      { ...task, projectId: '__proto__', id: 'done', completed: true, completedAt: at },
      task,
    ]
    expect(projectCounts(tasks).get('__proto__')).toBe(2)
    expect(selectTasks(tasks, 'Unassigned', defaultSelection, '2026-11-02').visible).toEqual([task])
    expect(
      selectTasks(tasks, 'Project', defaultSelection, '2026-11-02', '__proto__').visible,
    ).toHaveLength(2)
  })
})
describe('Upcoming and statistics', () => {
  const tasks = [
    task,
    { ...task, id: 'later', dueDate: '2028-02-29' },
    { ...task, id: 'today', dueDate: '2026-11-02' },
    { ...task, id: 'past', dueDate: '2026-11-01' },
    { ...task, id: 'none', dueDate: undefined },
    { ...task, id: 'done', completed: true, completedAt: at },
  ]
  it('groups future incomplete deadlines chronologically independent of within-day sort', () => {
    const result = selectTasks(
      tasks,
      'Upcoming',
      { ...defaultSelection, sort: 'title' },
      '2026-11-02',
    )
    expect(result.groups.map((g) => g.title)).toEqual(['Due Nov 3, 2026', 'Due Feb 29, 2028'])
    expect(result.visible.map((t) => t.id)).toEqual(['later', 'task'])
    expect(new Set(result.groups.flatMap((g) => g.tasks.map((t) => t.id))).size).toBe(2)
  })
  it('applies search, filters, day boundaries and empty states', () => {
    expect(
      selectTasks(tasks, 'Upcoming', { ...defaultSelection, query: 'missing' }, '2026-11-02')
        .visible,
    ).toEqual([])
    expect(
      selectTasks(
        tasks,
        'Upcoming',
        { ...defaultSelection, filters: { ...defaultSelection.filters, status: 'Completed' } },
        '2026-11-02',
      ).visible,
    ).toEqual([])
    expect(
      selectTasks(tasks, 'Upcoming', defaultSelection, '2028-02-28').visible.map((t) => t.id),
    ).toEqual(['later'])
    expect(selectTasks(tasks, 'Upcoming', defaultSelection, '2028-02-29').groups).toEqual([])
    expect(
      selectTasks(tasks, 'Today', defaultSelection, '2026-11-03').visible.map((t) => t.id),
    ).toContain('task')
  })
  it('counts completion instants on the local calendar day and removes reopened/deleted work', () => {
    const localMidnight = new Date(2026, 10, 2, 0, 0, 0).toISOString()
    const done = { ...task, completed: true, completedAt: localMidnight }
    expect(
      completedToday(
        [
          done,
          {
            ...done,
            id: 'prior',
            completedAt: new Date(new Date(localMidnight).getTime() - 1).toISOString(),
          },
        ],
        '2026-11-02',
      ),
    ).toBe(1)
    expect(
      completedToday([{ ...done, completed: false, completedAt: undefined }], '2026-11-02'),
    ).toBe(0)
    expect(completedToday([], '2026-11-02')).toBe(0)
  })
})
