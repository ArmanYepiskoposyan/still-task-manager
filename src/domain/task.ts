import { isCalendarDate } from '../lib/dates/calendar'

export const priorities = ['Low', 'Normal', 'High'] as const
export type Priority = (typeof priorities)[number]
export interface Task {
  readonly id: string
  readonly title: string
  readonly notes?: string
  readonly projectId?: string
  readonly completed: boolean
  readonly priority: Priority
  readonly dueDate?: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly completedAt?: string
}
export interface TaskDraft {
  projectId?: string
  title: string
  notes: string
  priority: Priority
  dueDate: string
}
export type DraftErrors = Partial<Record<keyof TaskDraft, string>>
export class TaskError extends Error {
  constructor(
    message: string,
    readonly fields: DraftErrors = {},
  ) {
    super(message)
    this.name = 'TaskError'
  }
}
export function validateDraft(draft: TaskDraft): DraftErrors {
  const errors: DraftErrors = {}
  if (!draft.title.trim()) errors.title = 'Give your task a title.'
  else if (draft.title.trim().length > 200)
    errors.title = 'Keep the title to 200 characters or fewer.'
  if (draft.notes.length > 5000) errors.notes = 'Keep notes to 5,000 characters or fewer.'
  if (!priorities.includes(draft.priority))
    errors.priority = 'Choose Low, Normal, or High priority.'
  if (draft.dueDate && !isCalendarDate(draft.dueDate))
    errors.dueDate = 'Choose a valid calendar date.'
  return errors
}
function fields(draft: TaskDraft) {
  const errors = validateDraft(draft)
  if (Object.keys(errors).length) throw new TaskError('Check the highlighted fields.', errors)
  return {
    projectId: draft.projectId || undefined,
    title: draft.title.trim(),
    notes: draft.notes || undefined,
    priority: draft.priority,
    dueDate: draft.dueDate || undefined,
  }
}
export function isTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))
    return false
  const time = new Date(value)
  return Number.isFinite(time.getTime()) && time.toISOString() === value
}
function timestamp(now: string, task?: Task) {
  if (!isTimestamp(now))
    throw new TaskError('The current time is invalid. Check your device clock.')
  return task && now < task.updatedAt ? task.updatedAt : now
}
export function createTask(draft: TaskDraft, id: string, now: string): Task {
  if (!id.trim() || id.length > 128) throw new TaskError('A task identifier could not be created.')
  const at = timestamp(now)
  return { ...fields(draft), id, completed: false, createdAt: at, updatedAt: at }
}
export function editTask(task: Task, draft: TaskDraft, now: string): Task {
  const next = fields(draft)
  if (
    task.projectId === next.projectId &&
    task.title === next.title &&
    task.notes === next.notes &&
    task.priority === next.priority &&
    task.dueDate === next.dueDate
  )
    return task
  return { ...task, ...next, updatedAt: timestamp(now, task) }
}
export function setCompletion(task: Task, completed: boolean, now: string): Task {
  if (task.completed === completed) return task
  const at = timestamp(now, task)
  return { ...task, completed, updatedAt: at, completedAt: completed ? at : undefined }
}
export type TaskCommand =
  | { type: 'create'; draft: TaskDraft; id: string; now: string }
  | { type: 'edit'; id: string; draft: TaskDraft; now: string }
  | { type: 'complete'; id: string; completed: boolean; now: string }
  | { type: 'delete'; id: string }

export function applyTaskCommand(tasks: readonly Task[], command: TaskCommand): readonly Task[] {
  if (command.type === 'create') {
    if (tasks.some((task) => task.id === command.id))
      throw new TaskError('This task identifier already exists. Please try again.')
    return [...tasks, createTask(command.draft, command.id, command.now)]
  }
  const current = tasks.find((task) => task.id === command.id)
  if (!current) throw new TaskError('This task no longer exists. Reload saved tasks and try again.')
  if (command.type === 'delete') return tasks.filter((task) => task.id !== command.id)
  const next =
    command.type === 'edit'
      ? editTask(current, command.draft, command.now)
      : setCompletion(current, command.completed, command.now)
  return next === current ? tasks : tasks.map((task) => (task.id === current.id ? next : task))
}

/** Validate untrusted stored JSON, including cross-field invariants. */
export function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const t = value as Record<string, unknown>
  return (
    typeof t.id === 'string' &&
    t.id.trim().length > 0 &&
    t.id.length <= 128 &&
    typeof t.title === 'string' &&
    t.title === t.title.trim() &&
    t.title.length > 0 &&
    t.title.length <= 200 &&
    (t.notes === undefined || (typeof t.notes === 'string' && t.notes.length <= 5000)) &&
    (t.projectId === undefined ||
      (typeof t.projectId === 'string' &&
        t.projectId.trim().length > 0 &&
        t.projectId.length <= 128)) &&
    typeof t.completed === 'boolean' &&
    priorities.includes(t.priority as Priority) &&
    (t.dueDate === undefined || isCalendarDate(t.dueDate)) &&
    isTimestamp(t.createdAt) &&
    isTimestamp(t.updatedAt) &&
    t.createdAt <= t.updatedAt &&
    (t.completed
      ? isTimestamp(t.completedAt) && t.createdAt <= t.completedAt && t.completedAt <= t.updatedAt
      : t.completedAt === undefined)
  )
}
