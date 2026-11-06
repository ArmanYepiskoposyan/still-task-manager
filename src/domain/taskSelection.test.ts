import { describe, expect, it } from 'vitest'
import { createTask } from './task'
import type { Task, TaskDraft } from './task'
import {
  activeFilterCount,
  defaultFilters,
  defaultSelection,
  isDueToday,
  isOverdue,
  matchesFilters,
  matchesSearch,
  matchesView,
  normalizeSearch,
  selectTasks,
  sortTasks,
  workload,
} from './taskSelection'
import type { DueFilter, TaskFilters, TaskSort, TaskView } from './taskSelection'
const today = '2028-03-01'
const at = '2028-02-01T08:00:00.000Z'
function task(id: string, change: Partial<Task> = {}): Task {
  return Object.freeze({
    ...createTask(
      { title: id, priority: 'Normal', notes: '', dueDate: '' } satisfies TaskDraft,
      id,
      at,
    ),
    ...change,
  })
}
const tasks = Object.freeze([
  task('late', { dueDate: '2028-02-29', priority: 'High', notes: 'Review the outline' }),
  task('now', { dueDate: today, priority: 'Low' }),
  task('future', { dueDate: '2028-03-02' }),
  task('undated'),
  task('done-late', { dueDate: '2028-02-28', completed: true, completedAt: at }),
  task('done-now', { dueDate: today, completed: true, completedAt: at }),
  task('done-future', { dueDate: '2028-03-03', completed: true, completedAt: at }),
])
const ids = (values: readonly Task[]) => values.map((t) => t.id)
describe('view classification with calendar keys', () => {
  it.each([
    ['Today', ['late', 'now']],
    ['Open tasks', ['late', 'now', 'future', 'undated']],
    ['Completed', ['done-late', 'done-now', 'done-future']],
    ['All tasks', tasks.map((t) => t.id)],
  ] as [TaskView, string[]][])('%s has truthful membership', (view, expected) => {
    expect(ids(tasks.filter((t) => matchesView(t, view, today)))).toEqual(expected)
  })
  it.each([
    ['2028-02-28', '2028-02-29', true],
    ['2028-02-29', '2028-03-01', true],
    ['2026-12-31', '2027-01-01', true],
    ['2027-01-31', '2027-02-01', true],
    ['2028-03-01', '2028-03-01', false],
    ['2028-03-02', '2028-03-01', false],
    [undefined, '2028-03-01', false],
  ] as [string | undefined, string, boolean][])(
    'classifies due %s at %s',
    (dueDate, day, overdue) => {
      expect(isOverdue(task('x', { dueDate }), day)).toBe(overdue)
    },
  )
  it.each(['2028-02-29', '2028-03-01', '2028-03-02'])(
    'completed task due %s is never Today or overdue',
    (dueDate) => {
      const done = task('x', { dueDate, completed: true, completedAt: at })
      expect(isOverdue(done, today)).toBe(false)
      expect(isDueToday(done, today)).toBe(false)
      expect(matchesView(done, 'Today', today)).toBe(false)
    },
  )
  it('changes date classification when the local day rolls over', () => {
    expect(isDueToday(tasks[1]!, today)).toBe(true)
    expect(isOverdue(tasks[1]!, '2028-03-02')).toBe(true)
    expect(isDueToday(tasks[2]!, '2028-03-02')).toBe(true)
  })
  it('accepts an explicit local day independently of timestamp UTC offsets', () => {
    const deadline = task('local', { dueDate: '2027-01-01', createdAt: '2026-12-31T23:00:00.000Z' })
    expect(matchesView(deadline, 'Today', '2026-12-31')).toBe(false)
    expect(isDueToday(deadline, '2027-01-01')).toBe(true)
  })
})
describe('literal Unicode search', () => {
  it.each(['', ' ', ' \t\n '])('blank %j returns the normal view', (query) =>
    expect(matchesSearch(tasks[0]!, query)).toBe(true),
  )
  it.each([
    ['A Thoughtful Step', '  THOUGHTFUL ', true],
    ['ԲԱՐԵՒ 🌿', 'բարև', true],
    ['ПРИВЕТ', 'привет', true],
    ['Straße', 'STRASSE', true],
    ['κόσμος', 'ΚΌΣΜΟΣ', true],
    ['Café', 'Cafe\u0301', true],
    ['Read 🌿 today', '🌿', true],
    ['Use [a-z].* literally', '[a-z].*', true],
    ['Something else', '.*', false],
    ['Résumé', 'resume', false],
    ['Alpha beta', 'alpha  beta', false],
  ])('%s searched for %s', (title, query, expected) =>
    expect(matchesSearch(task('x', { title }), query)).toBe(expected),
  )
  it('matches notes independently of the title', () =>
    expect(matchesSearch(tasks[0]!, 'OUTLINE')).toBe(true))
  it('does not match across the title/notes boundary', () =>
    expect(matchesSearch(task('x', { title: 'one', notes: 'two' }), 'one two')).toBe(false))
  it('normalizes canonical forms and query edges only', () =>
    expect(normalizeSearch('  Cafe\u0301  ')).toBe('café'))
})
describe('AND filters narrow views', () => {
  it.each([
    ['Any', tasks.map((t) => t.id)],
    ['Overdue', ['late']],
    ['Today', ['now', 'done-now']],
    ['Upcoming', ['future', 'done-future']],
    ['No due date', ['undated']],
  ] as [DueFilter, string[]][])('deadline filter %s', (due, expected) =>
    expect(ids(tasks.filter((t) => matchesFilters(t, { ...defaultFilters, due }, today)))).toEqual(
      expected,
    ),
  )
  it.each(['Low', 'Normal', 'High'] as const)('priority %s', (priority) => {
    const selected = tasks.filter((t) => matchesFilters(t, { ...defaultFilters, priority }, today))
    expect(selected.length).toBeGreaterThan(0)
    expect(selected.every((t) => t.priority === priority)).toBe(true)
  })
  it.each(['All', 'Incomplete', 'Completed'] as const)('status %s', (status) => {
    expect(
      ids(tasks.filter((t) => matchesFilters(t, { ...defaultFilters, status }, today))),
    ).toEqual(
      ids(tasks.filter((t) => status === 'All' || t.completed === (status === 'Completed'))),
    )
  })
  it('combines all filters with search', () => {
    const filters: TaskFilters = { status: 'Incomplete', priority: 'High', due: 'Overdue' }
    expect(
      ids(
        selectTasks(tasks, 'All tasks', { ...defaultSelection, filters, query: 'outline' }, today)
          .visible,
      ),
    ).toEqual(['late'])
    expect(activeFilterCount(filters)).toBe(3)
  })
  it.each(['Today', 'Open tasks'] as TaskView[])(
    'Completed filter does not override %s',
    (view) => {
      expect(
        selectTasks(
          tasks,
          view,
          { ...defaultSelection, filters: { ...defaultFilters, status: 'Completed' } },
          today,
        ).visible,
      ).toEqual([])
    },
  )
  it('contradictory completion and overdue filters yield no results', () => {
    expect(
      selectTasks(
        tasks,
        'All tasks',
        {
          ...defaultSelection,
          filters: { ...defaultFilters, status: 'Completed', due: 'Overdue' },
        },
        today,
      ).visible,
    ).toEqual([])
  })
  it('distinguishes total view membership from filtered results', () => {
    const result = selectTasks(
      tasks,
      'Open tasks',
      { ...defaultSelection, query: 'outline' },
      today,
    )
    expect(result.inViewCount).toBe(4)
    expect(result.visible).toHaveLength(1)
  })
})
describe('deterministic sorting, without persisted mutations', () => {
  const sample = Object.freeze([
    task('c', { title: 'zebra', priority: 'Low', createdAt: '2028-02-03T00:00:00.000Z' }),
    task('b', {
      title: 'beta',
      priority: 'High',
      dueDate: today,
      createdAt: '2028-02-02T00:00:00.000Z',
    }),
    task('a', { title: 'Alpha', priority: 'Normal', dueDate: '2028-02-29', createdAt: at }),
  ])
  it.each([
    ['due', ['a', 'b', 'c']],
    ['priority', ['b', 'a', 'c']],
    ['newest', ['c', 'b', 'a']],
    ['oldest', ['a', 'b', 'c']],
    ['title', ['a', 'b', 'c']],
  ] as [TaskSort, string[]][])('%s order', (sort, expected) => {
    const result = sortTasks(sample, sort)
    expect(ids(result)).toEqual(expected)
    expect(result).not.toBe(sample)
    expect(ids(sample)).toEqual(['c', 'b', 'a'])
  })
  it.each(['due', 'priority', 'newest', 'oldest', 'title'] as TaskSort[])(
    '%s ties use creation then ID and ignore input order',
    (sort) => {
      const a = task('a', { title: 'same' }),
        b = task('b', { title: 'same' })
      expect(ids(sortTasks([b, a], sort))).toEqual(['a', 'b'])
      expect(ids(sortTasks([a, b], sort))).toEqual(['a', 'b'])
    },
  )
  it('ties in due/priority/title prefer older creation', () => {
    const earlier = task('z', { title: 'same' }),
      later = task('a', { title: 'same', createdAt: '2028-02-02T00:00:00.000Z' })
    for (const sort of ['due', 'priority', 'title'] as TaskSort[])
      expect(ids(sortTasks([later, earlier], sort))).toEqual(['z', 'a'])
  })
  it('orders all undated tasks last, including after the last supported calendar date', () => {
    expect(ids(sortTasks([task('none'), task('last', { dueDate: '9999-12-31' })], 'due'))).toEqual([
      'last',
      'none',
    ])
  })
  it('uses alphabetic Unicode collation with deterministic accent/case ties', () => {
    expect(
      ids(
        sortTasks(
          [
            task('b', { title: 'éclair' }),
            task('a', { title: 'ECLAIR' }),
            task('c', { title: 'Banana' }),
          ],
          'title',
        ),
      ),
    ).toEqual(['c', 'a', 'b'])
  })
  it('keeps Today groups distinct under every sort', () => {
    for (const sort of ['due', 'priority', 'newest', 'oldest', 'title'] as TaskSort[]) {
      const result = selectTasks(tasks, 'Today', { ...defaultSelection, sort }, today)
      expect(result.groups.map((g) => g.title)).toEqual(['Overdue', 'Due today'])
      expect(ids(result.groups[0]!.tasks)).toEqual(['late'])
      expect(ids(result.groups[1]!.tasks)).toEqual(['now'])
    }
  })
  it('selection does not mutate the original objects or saved collection order', () => {
    const before = JSON.stringify(tasks)
    selectTasks(tasks, 'All tasks', { ...defaultSelection, sort: 'priority', query: 'a' }, today)
    expect(JSON.stringify(tasks)).toBe(before)
  })
})
describe('workload and empty results', () => {
  it('derives global counts independently of selected filters', () =>
    expect(workload(tasks, today)).toEqual({
      total: 7,
      open: 4,
      completed: 3,
      dueToday: 1,
      overdue: 1,
    }))
  it('updates counts after date rollover and completion', () => {
    expect(workload(tasks, '2028-03-02')).toMatchObject({ dueToday: 1, overdue: 2 })
    expect(
      workload(
        tasks.map((t) => ({ ...t, completed: true })),
        today,
      ),
    ).toMatchObject({ open: 0, completed: 7, dueToday: 0, overdue: 0 })
  })
  it('handles an empty collection', () => {
    expect(selectTasks([], 'Today', defaultSelection, today)).toEqual({
      inViewCount: 0,
      visible: [],
      groups: [],
    })
    expect(workload([], today)).toEqual({
      total: 0,
      open: 0,
      completed: 0,
      dueToday: 0,
      overdue: 0,
    })
  })
  it('returns a no-results selection while keeping the source collection', () => {
    expect(
      selectTasks(tasks, 'All tasks', { ...defaultSelection, query: 'absent' }, today),
    ).toEqual({ inViewCount: 7, visible: [], groups: [] })
    expect(tasks).toHaveLength(7)
  })
})
