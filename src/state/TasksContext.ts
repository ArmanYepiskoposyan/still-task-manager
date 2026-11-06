import { createContext, useContext } from 'react'
import type { TaskDraft } from '../domain/task'
import type { WorkspaceData } from '../domain/project'
import type { TaskState } from './taskState'
export type MutationResult = { ok: true } | { ok: false; message: string }
export interface TasksService extends TaskState {
  create(draft: TaskDraft): MutationResult
  edit(id: string, draft: TaskDraft): MutationResult
  complete(id: string, completed: boolean): MutationResult
  remove(id: string): MutationResult
  createProject(name: string): MutationResult
  renameProject(id: string, name: string): MutationResult
  deleteProject(id: string): MutationResult
  readRaw(): string | null
  exportBackup(): string
  replace(data: WorkspaceData, expectedRaw: string | null): MutationResult
  reload(): void
}
export const TasksContext = createContext<TasksService | null>(null)
export function useTasks() {
  const context = useContext(TasksContext)
  if (!context) throw new Error('TasksProvider is required')
  return context
}
