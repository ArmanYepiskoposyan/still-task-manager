import { isTask } from '../../domain/task'
import type { Task } from '../../domain/task'
import { isProject } from '../../domain/project'
import type { Project, WorkspaceData } from '../../domain/project'
import { normalizeSearch } from '../../domain/taskSelection'

export const TASKS_KEY = 'still.tasks'
export const SCHEMA_VERSION = 2
export type StorageIssue = 'unavailable' | 'write' | 'corrupt' | 'unsupported' | 'conflict'
export class StorageError extends Error {
  constructor(
    readonly kind: StorageIssue,
    message: string,
  ) {
    super(message)
    this.name = 'StorageError'
  }
}
export interface Snapshot extends WorkspaceData {
  readonly raw: string | null
}
export interface TaskRepository {
  read(): Snapshot
  readRaw(): string | null
  commit(
    tasks: readonly Task[],
    expectedRaw: string | null,
    projects?: readonly Project[],
  ): Snapshot
  replace(data: WorkspaceData, expectedRaw: string | null): Snapshot
}
export type StoragePort = Pick<Storage, 'getItem' | 'setItem'>

function knownTaskFields({
  id,
  title,
  notes,
  completed,
  priority,
  dueDate,
  createdAt,
  updatedAt,
  completedAt,
  projectId,
}: Task): Task {
  return {
    id,
    title,
    notes,
    completed,
    priority,
    dueDate,
    createdAt,
    updatedAt,
    completedAt,
    projectId,
  }
}
function knownProjectFields({ id, name, createdAt, updatedAt }: Project): Project {
  return { id, name, createdAt, updatedAt }
}
const invalid = (detail: string): never => {
  throw new StorageError(
    'corrupt',
    `The saved workspace contains ${detail}. It has been left untouched.`,
  )
}
/** Parse one complete document; v1 upgrades in memory without changing the raw conflict token. */
export function deserializeTasks(raw: string | null): Snapshot {
  if (raw === null) return { tasks: [], projects: [], raw }
  let document: unknown
  try {
    document = JSON.parse(raw)
  } catch {
    return invalid('invalid JSON')
  }
  if (!document || typeof document !== 'object' || Array.isArray(document))
    return invalid('an invalid document')
  const data = document as Record<string, unknown>
  if (!Number.isInteger(data.version)) return invalid('no valid schema version')
  if (data.version !== 1 && data.version !== SCHEMA_VERSION)
    throw new StorageError(
      'unsupported',
      'This saved workspace uses an unsupported version. It has been left untouched.',
    )
  // v1 never supported project metadata. Ignore unknown properties, including projectId.
  const taskValues = Array.isArray(data.tasks)
    ? data.tasks.map((value) => {
        if (data.version !== 1 || !value || typeof value !== 'object' || Array.isArray(value))
          return value
        const { projectId: _ignored, ...legacy } = value
        void _ignored
        return legacy
      })
    : null
  if (
    !taskValues ||
    !taskValues.every(isTask) ||
    new Set(taskValues.map((t) => t.id)).size !== taskValues.length
  )
    return invalid('invalid tasks')
  const projectValues: unknown = data.version === 1 ? [] : data.projects
  if (
    !Array.isArray(projectValues) ||
    !projectValues.every(isProject) ||
    new Set(projectValues.map((p) => p.id)).size !== projectValues.length ||
    new Set(projectValues.map((p) => normalizeSearch(p.name))).size !== projectValues.length
  )
    return invalid('invalid projects or duplicate project names')
  const ids = new Set(projectValues.map((p) => p.id))
  if (taskValues.some((t) => t.projectId !== undefined && !ids.has(t.projectId)))
    return invalid('invalid project references')
  return {
    tasks: taskValues.map(knownTaskFields),
    projects: projectValues.map(knownProjectFields),
    raw,
  }
}
export function serializeTasks(tasks: readonly Task[], projects: readonly Project[] = []): string {
  // Validate before projection as well, so invalid values cannot disappear during JSON serialization.
  if (!tasks.every(isTask) || !projects.every(isProject))
    return invalid('invalid tasks or projects')
  const raw = JSON.stringify({
    version: SCHEMA_VERSION,
    tasks: tasks.map(knownTaskFields),
    projects: projects.map(knownProjectFields),
  })
  deserializeTasks(raw)
  return raw
}
export function createTaskRepository(
  getStorage: () => StoragePort = () => window.localStorage,
): TaskRepository {
  const readRaw = () => {
    try {
      return getStorage().getItem(TASKS_KEY)
    } catch {
      throw new StorageError(
        'unavailable',
        'Browser storage is unavailable. Allow storage for this site, then try again.',
      )
    }
  }
  const write = (data: WorkspaceData, expectedRaw: string | null, recovery: boolean): Snapshot => {
    const raw = serializeTasks(data.tasks, data.projects)
    const current = readRaw()
    // Ordinary edits must never overwrite corruption. Explicit replacement is a separate path.
    if (!recovery) deserializeTasks(current)
    if (current !== expectedRaw)
      throw new StorageError(
        'conflict',
        'Saved tasks changed in another tab. Close any editor and reload saved tasks before trying again.',
      )
    try {
      getStorage().setItem(TASKS_KEY, raw)
    } catch {
      throw new StorageError(
        'write',
        'Your change wasn’t saved. Browser storage may be full or blocked. Free some space or allow storage, then try again.',
      )
    }
    return deserializeTasks(raw)
  }
  return {
    read: () => deserializeTasks(readRaw()),
    readRaw,
    commit: (tasks, expectedRaw, projects = []) => write({ tasks, projects }, expectedRaw, false),
    replace: (data, expectedRaw) => write(data, expectedRaw, true),
  }
}
