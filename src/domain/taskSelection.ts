import { formatDueDate, localDateKey } from '../lib/dates/calendar'
import type { Priority, Task } from './task'

export type TaskView =
  'Today' | 'Open tasks' | 'All tasks' | 'Completed' | 'Upcoming' | 'Unassigned' | 'Project'
export type StatusFilter = 'All' | 'Incomplete' | 'Completed'
export type DueFilter = 'Any' | 'Overdue' | 'Today' | 'Upcoming' | 'No due date'
export type TaskSort = 'due' | 'priority' | 'newest' | 'oldest' | 'title'
export interface TaskFilters {
  status: StatusFilter
  priority: 'All' | Priority
  due: DueFilter
}
export interface TaskSelection {
  query: string
  filters: TaskFilters
  sort: TaskSort
}
export const defaultFilters: Readonly<TaskFilters> = { status: 'All', priority: 'All', due: 'Any' }
export const defaultSelection: Readonly<TaskSelection> = {
  query: '',
  filters: defaultFilters,
  sort: 'due',
}
type SelectableTask = Pick<
  Task,
  'completed' | 'dueDate' | 'priority' | 'title' | 'notes' | 'projectId'
>

/** Compare validated calendar keys directly: deadlines are not UTC instants. */
export function isOverdue(task: Pick<Task, 'completed' | 'dueDate'>, today: string): boolean {
  return !task.completed && !!task.dueDate && task.dueDate < today
}
export function isDueToday(task: Pick<Task, 'completed' | 'dueDate'>, today: string): boolean {
  return !task.completed && task.dueDate === today
}
export function matchesView(task: SelectableTask, view: TaskView, today: string): boolean {
  if (view === 'Upcoming') return !task.completed && !!task.dueDate && task.dueDate > today
  if (view === 'Unassigned') return !task.projectId
  if (view === 'Today') return isOverdue(task, today) || isDueToday(task, today)
  if (view === 'Open tasks') return !task.completed
  if (view === 'Completed') return task.completed
  return true
}
/** Literal Unicode case normalization; accents are preserved and canonical forms agree. */
export function normalizeSearch(value: string): string {
  return value.trim().normalize('NFC').toUpperCase().toLowerCase().normalize('NFC')
}
export function matchesSearch(task: SelectableTask, query: string): boolean {
  const needle = normalizeSearch(query)
  return (
    !needle ||
    normalizeSearch(task.title).includes(needle) ||
    normalizeSearch(task.notes ?? '').includes(needle)
  )
}
export function matchesFilters(task: SelectableTask, filters: TaskFilters, today: string): boolean {
  if (
    (filters.status === 'Incomplete' && task.completed) ||
    (filters.status === 'Completed' && !task.completed)
  )
    return false
  if (filters.priority !== 'All' && task.priority !== filters.priority) return false
  switch (filters.due) {
    case 'Overdue':
      return isOverdue(task, today)
    // Unlike the Today view, these deadline filters do not imply a completion status.
    case 'Today':
      return task.dueDate === today
    case 'Upcoming':
      return !!task.dueDate && task.dueDate > today
    case 'No due date':
      return !task.dueDate
    default:
      return true
  }
}
export function matchesSelection(
  task: SelectableTask,
  view: TaskView,
  selection: TaskSelection,
  today: string,
): boolean {
  return (
    matchesView(task, view, today) &&
    matchesFilters(task, selection.filters, today) &&
    matchesSearch(task, selection.query)
  )
}
export function activeFilterCount(filters: TaskFilters): number {
  return (
    Number(filters.status !== 'All') +
    Number(filters.priority !== 'All') +
    Number(filters.due !== 'Any')
  )
}
const priorityOrder: Record<Priority, number> = { High: 0, Normal: 1, Low: 2 }
const titleOrder = new Intl.Collator('en', { sensitivity: 'base' })
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
export function sortTasks(tasks: readonly Task[], sort: TaskSort): Task[] {
  return [...tasks].sort((a, b) => {
    let primary = 0
    switch (sort) {
      case 'due':
        primary = compare(a.dueDate ?? '99999', b.dueDate ?? '99999')
        break
      case 'priority':
        primary = priorityOrder[a.priority] - priorityOrder[b.priority]
        break
      case 'newest':
        primary = compare(b.createdAt, a.createdAt)
        break
      case 'oldest':
        primary = compare(a.createdAt, b.createdAt)
        break
      case 'title':
        primary = titleOrder.compare(a.title, b.title)
        break
    }
    return primary || compare(a.createdAt, b.createdAt) || compare(a.id, b.id)
  })
}
export function selectTasks(
  tasks: readonly Task[],
  view: TaskView,
  selection: TaskSelection,
  today: string,
  projectId?: string,
) {
  const inView = tasks.filter(
    (task) =>
      matchesView(task, view, today) && (view !== 'Project' || task.projectId === projectId),
  )
  const matching = inView.filter(
    (task) =>
      matchesFilters(task, selection.filters, today) && matchesSearch(task, selection.query),
  )
  const visible = sortTasks(matching, selection.sort)
  const byDate = new Map<string, Task[]>()
  if (view === 'Upcoming')
    for (const task of visible) {
      const date = task.dueDate!
      const group = byDate.get(date)
      if (group) group.push(task)
      else byDate.set(date, [task])
    }
  const groups =
    view === 'Upcoming'
      ? [...byDate.keys()].sort().map((date) => ({
          title: formatDueDate(date),
          tasks: byDate.get(date)!,
        }))
      : view === 'Today'
        ? [
            { title: 'Overdue', tasks: visible.filter((task) => isOverdue(task, today)) },
            { title: 'Due today', tasks: visible.filter((task) => isDueToday(task, today)) },
          ]
        : [
            {
              title:
                view === 'Completed'
                  ? 'Already taken care of'
                  : view === 'All tasks'
                    ? 'Your tasks'
                    : 'On your list',
              tasks: visible,
            },
          ]
  return {
    inViewCount: inView.length,
    visible,
    groups: groups.filter((group) => group.tasks.length > 0),
  }
}
export function workload(tasks: readonly Task[], today: string) {
  return tasks.reduce(
    (counts, task) => ({
      ...counts,
      total: counts.total + 1,
      open: counts.open + Number(!task.completed),
      completed: counts.completed + Number(task.completed),
      dueToday: counts.dueToday + Number(isDueToday(task, today)),
      overdue: counts.overdue + Number(isOverdue(task, today)),
    }),
    { total: 0, open: 0, completed: 0, dueToday: 0, overdue: 0 },
  )
}
export type Workload = ReturnType<typeof workload>

/** Current completed records whose completion instant falls on this local day; not an event history. */
export function completedToday(tasks: readonly Task[], today: string): number {
  return tasks.reduce(
    (count, task) =>
      count +
      Number(
        task.completed && !!task.completedAt && localDateKey(new Date(task.completedAt)) === today,
      ),
    0,
  )
}
