import type { Snapshot } from '../lib/persistence/taskRepository'
export interface TaskState {
  snapshot: Snapshot | null
  loadError: string | null
  mutationError: string | null
  notice: string
}
export type StateAction =
  | { type: 'loaded'; snapshot: Snapshot }
  | { type: 'saved'; snapshot: Snapshot; notice: string }
  | { type: 'load-failed'; message: string }
  | { type: 'failed'; message: string }
export function taskReducer(state: TaskState, action: StateAction): TaskState {
  switch (action.type) {
    case 'loaded':
      return { snapshot: action.snapshot, loadError: null, mutationError: null, notice: '' }
    case 'saved':
      return {
        snapshot: action.snapshot,
        loadError: null,
        mutationError: null,
        notice: action.notice,
      }
    case 'load-failed':
      return { ...state, loadError: action.message, notice: '' }
    case 'failed':
      return { ...state, mutationError: action.message, notice: '' }
  }
}
