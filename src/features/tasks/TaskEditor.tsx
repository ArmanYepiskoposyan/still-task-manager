import { useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { priorities, validateDraft } from '../../domain/task'
import type { DraftErrors, Priority, Task, TaskDraft } from '../../domain/task'
import { useTasks } from '../../state/TasksContext'

export function TaskEditor({
  task,
  onClose,
  onSaved,
  defaultProjectId,
}: {
  defaultProjectId?: string
  task: Task | null
  onClose: () => void
  onSaved?: (draft: TaskDraft) => void
}) {
  const service = useTasks()
  const titleRef = useRef<HTMLInputElement>(null)
  const close = () => titleRef.current?.closest('dialog')?.close()
  const submitted = useRef(false)
  const [draft, setDraft] = useState<TaskDraft>({
    projectId: task?.projectId ?? defaultProjectId ?? '',
    title: task?.title ?? '',
    notes: task?.notes ?? '',
    priority: task?.priority ?? 'Normal',
    dueDate: task?.dueDate ?? '',
  })
  const [errors, setErrors] = useState<DraftErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editedAfterFailure, setEditedAfterFailure] = useState(false)
  const field = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => {
    if (saveError) setEditedAfterFailure(true)
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }
  const save = (close: () => void) => {
    if (submitted.current) return
    const problems = validateDraft(draft)
    setErrors(problems)
    if (Object.keys(problems).length) {
      const first = Object.keys(problems)[0]
      document.getElementById(`task-${first === 'dueDate' ? 'date' : first}`)?.focus()
      return
    }
    submitted.current = true
    const result = task ? service.edit(task.id, draft) : service.create(draft)
    if (result.ok) {
      onSaved?.(draft)
      close()
    } else {
      submitted.current = false
      setSaveError(result.message)
      setEditedAfterFailure(false)
    }
  }
  return (
    <Modal
      titleId="editor-title"
      descriptionId="editor-description"
      initialFocus={titleRef}
      onClose={onClose}
    >
      <>
        <div className="dialog-heading">
          <div className="dialog-symbol">
            <Icon name="edit" />
          </div>
          <span className="eyebrow">A LITTLE ROOM TO THINK</span>
          <button
            className="icon-button close-dialog"
            onClick={close}
            aria-label="Close task editor"
          >
            <Icon name="close" />
          </button>
        </div>
        <h2 id="editor-title">{task ? 'A closer look.' : 'What’s on your mind?'}</h2>
        <p id="editor-description" className="muted">
          {task
            ? 'Edit the details. Make room for your next step.'
            : 'Start small. Give your next step a name.'}
        </p>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            save(close)
          }}
        >
          <label htmlFor="task-title">
            Task title <span className="optional">Required</span>
          </label>
          <input
            ref={titleRef}
            id="task-title"
            value={draft.title}
            onChange={(event) => field('title', event.target.value)}
            maxLength={200}
            required
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'title-error' : undefined}
            placeholder="Give your next step a name"
          />
          {errors.title && (
            <p id="title-error" className="field-error" role="alert">
              {errors.title}
            </p>
          )}
          <label htmlFor="task-notes">
            Notes <span className="optional">Optional</span>
          </label>
          <textarea
            id="task-notes"
            rows={3}
            maxLength={5000}
            value={draft.notes}
            onChange={(event) => field('notes', event.target.value)}
            aria-invalid={!!errors.notes}
            aria-describedby={errors.notes ? 'notes-error' : undefined}
            placeholder="A few details, a little context…"
          />
          {errors.notes && (
            <p id="notes-error" className="field-error" role="alert">
              {errors.notes}
            </p>
          )}
          <div className="form-columns">
            <div>
              <label htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                value={draft.priority}
                onChange={(event) => field('priority', event.target.value as Priority)}
                aria-invalid={!!errors.priority}
                aria-describedby={errors.priority ? 'priority-error' : undefined}
              >
                {priorities.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              {errors.priority && (
                <p id="priority-error" className="field-error" role="alert">
                  {errors.priority}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="task-date">
                Due date <span className="optional">Optional</span>
              </label>
              <input
                id="task-date"
                type="date"
                min="0001-01-01"
                max="9999-12-31"
                value={draft.dueDate}
                onChange={(event) => field('dueDate', event.target.value)}
                aria-invalid={!!errors.dueDate}
                aria-describedby={errors.dueDate ? 'date-error' : undefined}
              />
              {errors.dueDate && (
                <p id="date-error" className="field-error" role="alert">
                  {errors.dueDate}
                </p>
              )}
            </div>
          </div>
          <label htmlFor="task-project">
            Project <span className="optional">Optional</span>
          </label>
          <select
            id="task-project"
            value={draft.projectId ?? ''}
            onChange={(event) => field('projectId', event.target.value)}
          >
            <option value="">Unassigned</option>
            {service.snapshot?.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {saveError && (
            <div className="error-detail save-error" role="alert">
              <Icon name="warning" size={18} />
              <p>
                Last save attempt: {saveError} Your draft is still here.
                {editedAfterFailure &&
                  ' You’ve edited it since that attempt. Save again to try the current draft.'}
              </p>
            </div>
          )}
          <div className="editor-notice">
            <Icon name="lock" size={17} />
            <p>Saved in this browser, on this device. Your tasks stay with you.</p>
          </div>
          <div className="dialog-actions">
            <button type="button" className="button secondary" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="button primary">
              {task ? 'Save changes' : 'Create task'}
              <Icon name="arrow" size={16} />
            </button>
          </div>
        </form>
      </>
    </Modal>
  )
}
