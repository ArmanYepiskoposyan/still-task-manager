import { isTimestamp, TaskError } from './task'
import type { Task } from './task'
import { normalizeSearch } from './taskSelection'

export interface Project {
  readonly id: string
  readonly name: string
  readonly createdAt: string
  readonly updatedAt: string
}
export interface WorkspaceData {
  readonly tasks: readonly Task[]
  readonly projects: readonly Project[]
}
export function isIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 128
}
export function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const p = value as Record<string, unknown>
  return (
    isIdentifier(p.id) &&
    typeof p.name === 'string' &&
    p.name === p.name.trim() &&
    p.name.length > 0 &&
    p.name.length <= 80 &&
    isTimestamp(p.createdAt) &&
    isTimestamp(p.updatedAt) &&
    p.createdAt <= p.updatedAt
  )
}
export function projectName(name: string, projects: readonly Project[], exceptId?: string): string {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 80) throw new TaskError('Use a project name of 1–80 characters.')
  if (
    projects.some((p) => p.id !== exceptId && normalizeSearch(p.name) === normalizeSearch(trimmed))
  )
    throw new TaskError('A project with this name already exists. Choose a different name.')
  return trimmed
}
export type ProjectCommand =
  | { type: 'create'; id: string; name: string; now: string }
  | { type: 'rename'; id: string; name: string; now: string }
  | { type: 'delete'; id: string }
export function applyProjectCommand(data: WorkspaceData, command: ProjectCommand): WorkspaceData {
  const current = data.projects.find((p) => p.id === command.id)
  if (command.type === 'create') {
    if (!isIdentifier(command.id) || current)
      throw new TaskError('This project identifier is invalid or already exists.')
    if (!isTimestamp(command.now))
      throw new TaskError('The current time is invalid. Check your device clock.')
    return {
      ...data,
      projects: [
        ...data.projects,
        {
          id: command.id,
          name: projectName(command.name, data.projects),
          createdAt: command.now,
          updatedAt: command.now,
        },
      ],
    }
  }
  if (!current)
    throw new TaskError('This project no longer exists. Reload saved tasks and try again.')
  if (command.type === 'delete') {
    // Organizational removal preserves every task identity and historical timestamp.
    return {
      projects: data.projects.filter((p) => p.id !== command.id),
      tasks: data.tasks.map((task) =>
        task.projectId === command.id ? { ...task, projectId: undefined } : task,
      ),
    }
  }
  const name = projectName(command.name, data.projects, command.id)
  if (!isTimestamp(command.now))
    throw new TaskError('The current time is invalid. Check your device clock.')
  if (name === current.name) return data
  return {
    ...data,
    projects: data.projects.map((p) =>
      p.id === command.id
        ? { ...p, name, updatedAt: command.now < p.updatedAt ? p.updatedAt : command.now }
        : p,
    ),
  }
}
export function projectCounts(tasks: readonly Task[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const task of tasks)
    if (task.projectId) counts.set(task.projectId, (counts.get(task.projectId) ?? 0) + 1)
  return counts
}
