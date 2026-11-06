import { Icon } from '../../components/Icon'
import type { Task } from '../../domain/task'
import { formatDueDate } from '../../lib/dates/calendar'
export interface TaskRowActions {
  onEdit: (task: Task, opener: HTMLElement) => void
  onDelete: (task: Task, opener: HTMLElement) => void
  onComplete: (task: Task, completed: boolean, opener: HTMLElement) => void
}
export function TaskRow({ task, onEdit, onDelete, onComplete }: TaskRowActions & { task: Task }) {
  return (
    <li
      data-task-id={task.id}
      className={`task-row real-task-row ${task.completed ? 'is-completed' : ''}`}
    >
      <label className="completion-control">
        <input
          type="checkbox"
          checked={task.completed}
          aria-label={`${task.completed ? 'Reopen' : 'Complete'} task: ${task.title}`}
          onChange={(event) => onComplete(task, event.target.checked, event.currentTarget)}
        />
        <span className={`task-status ${task.completed ? 'is-checked' : ''}`} aria-hidden="true">
          {task.completed && <Icon name="check" size={12} />}
        </span>
      </label>
      <button
        className="task-preview"
        onClick={(event) => onEdit(task, event.currentTarget)}
        aria-label={`Edit task: ${task.title}`}
      >
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          <span>{formatDueDate(task.dueDate)}</span>
          <span className="meta-separator">·</span>
          <span className={`priority priority-${task.priority.toLowerCase()}`}>
            <Icon name="flag" size={12} />
            {task.priority}
          </span>
          {task.notes && <span className="notes-indicator">· Notes</span>}
        </span>
      </button>
      <button
        className="icon-button task-delete"
        onClick={(event) => onDelete(task, event.currentTarget)}
        aria-label={`Delete task: ${task.title}`}
      >
        <Icon name="trash" size={17} />
      </button>
    </li>
  )
}
