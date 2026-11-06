import { expect, it } from 'vitest'
import { taskReducer } from './taskState'
import type { TaskState } from './taskState'
it('preserves the last committed snapshot on mutation or load failures', () => {
  const initial: TaskState = {
    snapshot: { tasks: [], projects: [], raw: null },
    loadError: null,
    mutationError: null,
    notice: '',
  }
  const failed = taskReducer(initial, { type: 'failed', message: 'Could not save' })
  expect(failed.snapshot).toBe(initial.snapshot)
  expect(failed.mutationError).toBe('Could not save')
  expect(taskReducer(failed, { type: 'load-failed', message: 'Could not read' }).snapshot).toBe(
    initial.snapshot,
  )
})
it('publishes a committed snapshot and clears errors on recovery', () => {
  const initial: TaskState = {
    snapshot: null,
    loadError: 'blocked',
    mutationError: 'failed',
    notice: '',
  }
  const snapshot = { tasks: [], projects: [], raw: '{"version":1,"tasks":[]}' }
  expect(taskReducer(initial, { type: 'saved', snapshot, notice: 'Saved' })).toEqual({
    snapshot,
    loadError: null,
    mutationError: null,
    notice: 'Saved',
  })
  expect(taskReducer(initial, { type: 'loaded', snapshot }).loadError).toBeNull()
})
