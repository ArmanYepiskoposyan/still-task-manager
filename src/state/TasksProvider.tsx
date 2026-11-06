import { useEffect, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { applyTaskCommand } from '../domain/task'
import { applyProjectCommand } from '../domain/project'
import type { ProjectCommand, WorkspaceData } from '../domain/project'
import { createBackup } from '../lib/persistence/backup'
import type { TaskCommand } from '../domain/task'
import { createTaskRepository, TASKS_KEY } from '../lib/persistence/taskRepository'
import type { TaskRepository } from '../lib/persistence/taskRepository'
import { TasksContext } from './TasksContext'
import type { MutationResult } from './TasksContext'
import { taskReducer } from './taskState'
import type { StateAction, TaskState } from './taskState'

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'The change could not be saved. Please try again.'
const load = (repository: TaskRepository): TaskState => {
  try {
    return { snapshot: repository.read(), loadError: null, mutationError: null, notice: '' }
  } catch (error) {
    return { snapshot: null, loadError: messageOf(error), mutationError: null, notice: '' }
  }
}
export function TasksProvider({
  children,
  repository,
}: {
  children: ReactNode
  repository?: TaskRepository
}) {
  const [repo] = useState(() => repository ?? createTaskRepository())
  const [state, dispatch] = useReducer(taskReducer, repo, load)
  // A synchronous cursor to the SAME committed snapshot prevents stale closures
  // losing rapid operations before React renders. It never contains an optimistic task list.
  const current = useRef(state)
  const publish = (action: StateAction) => {
    current.current = taskReducer(current.current, action)
    dispatch(action)
  }
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      // sessionStorage events can arrive from same-origin frames too.
      try {
        if (event.storageArea && event.storageArea !== window.localStorage) return
      } catch {
        // Storage access can be revoked; the repository reports it on read/write.
        return
      }
      if (event.key === TASKS_KEY || event.key === null)
        publish({
          type: 'failed',
          message:
            'Saved tasks changed in another tab. Close any editor and reload saved tasks before trying again.',
        })
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [])
  const change = (
    transform: (data: WorkspaceData) => WorkspaceData,
    notice: string,
  ): MutationResult => {
    try {
      const snapshot = current.current.snapshot
      if (!snapshot || current.current.loadError)
        return { ok: false, message: 'Reload saved tasks before making changes.' }
      const data = transform(snapshot)
      const unchanged = data.tasks === snapshot.tasks && data.projects === snapshot.projects
      // Even a no-op checks storage, so external changes cannot be mistaken for a successful save.
      const next = unchanged ? repo.read() : repo.commit(data.tasks, snapshot.raw, data.projects)
      if (unchanged && next.raw !== snapshot.raw)
        throw new Error(
          'Saved tasks changed in another tab. Close the editor and reload saved tasks.',
        )
      publish({ type: 'saved', snapshot: next, notice })
      return { ok: true }
    } catch (error) {
      const message = messageOf(error)
      publish({ type: 'failed', message })
      return { ok: false, message }
    }
  }
  const run = (command: () => TaskCommand, notice: string) =>
    change((data) => ({ ...data, tasks: applyTaskCommand(data.tasks, command()) }), notice)
  const project = (command: ProjectCommand, notice: string) =>
    change((data) => applyProjectCommand(data, command), notice)
  return (
    <TasksContext.Provider
      value={{
        ...state,
        createProject: (name) =>
          project(
            { type: 'create', name, id: crypto.randomUUID(), now: new Date().toISOString() },
            'Project created and saved.',
          ),
        renameProject: (id, name) =>
          project(
            { type: 'rename', id, name, now: new Date().toISOString() },
            'Project renamed and saved.',
          ),
        deleteProject: (id) =>
          project({ type: 'delete', id }, 'Project deleted. Its tasks are now unassigned.'),
        readRaw: () => repo.readRaw(),
        exportBackup: () => {
          const snapshot = current.current.snapshot
          if (!snapshot || current.current.loadError)
            throw new Error(
              'Reload valid saved data before exporting a backup. You can download the raw document for recovery.',
            )
          const fresh = repo.read()
          if (fresh.raw !== snapshot.raw)
            throw new Error(
              'Saved tasks changed in another tab. Reload saved tasks before exporting.',
            )
          return createBackup(fresh)
        },
        replace: (data, expectedRaw) => {
          try {
            const next = repo.replace(data, expectedRaw)
            publish({
              type: 'saved',
              snapshot: next,
              notice: 'Backup restored and saved. The workspace has been replaced.',
            })
            return { ok: true }
          } catch (error) {
            const message = messageOf(error)
            publish({ type: 'failed', message })
            return { ok: false, message }
          }
        },
        create: (draft) =>
          run(
            () => ({
              type: 'create',
              draft,
              id: crypto.randomUUID(),
              now: new Date().toISOString(),
            }),
            'Task created and saved.',
          ),
        edit: (id, draft) =>
          run(() => ({ type: 'edit', id, draft, now: new Date().toISOString() }), 'Task saved.'),
        complete: (id, completed) =>
          run(
            () => ({ type: 'complete', id, completed, now: new Date().toISOString() }),
            completed ? 'Task completed and saved.' : 'Task reopened and saved.',
          ),
        remove: (id) => run(() => ({ type: 'delete', id }), 'Task deleted.'),
        reload: () => {
          try {
            publish({ type: 'loaded', snapshot: repo.read() })
          } catch (error) {
            publish({ type: 'load-failed', message: messageOf(error) })
          }
        },
      }}
    >
      {children}
    </TasksContext.Provider>
  )
}
