import { useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import type { Task } from '../../domain/task'
import { useTasks } from '../../state/TasksContext'
export function DeleteTaskDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const close = () => cancelRef.current?.closest('dialog')?.close()
  const submitted = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const { remove } = useTasks()
  return (
    <Modal
      titleId="delete-title"
      descriptionId="delete-description"
      initialFocus={cancelRef}
      onClose={onClose}
    >
      <>
        <div className="dialog-heading">
          <div className="dialog-symbol delete-symbol">
            <Icon name="trash" />
          </div>
          <span className="eyebrow">A MOMENT TO CHECK</span>
          <button
            className="icon-button close-dialog"
            aria-label="Close deletion confirmation"
            onClick={close}
          >
            <Icon name="close" />
          </button>
        </div>
        <h2 id="delete-title">Delete this task?</h2>
        <p id="delete-description" className="muted">
          This permanently removes the task from this browser. This action can’t be undone.
        </p>
        <p className="delete-task-title">{task.title}</p>
        {error && (
          <div className="error-detail save-error" role="alert">
            <Icon name="warning" size={18} />
            <p>{error} The task has not been deleted.</p>
          </div>
        )}
        <div className="dialog-actions">
          <button ref={cancelRef} className="button secondary" onClick={close}>
            Keep task
          </button>
          <button
            className="button danger"
            onClick={() => {
              if (submitted.current) return
              submitted.current = true
              const result = remove(task.id)
              if (result.ok) close()
              else {
                submitted.current = false
                setError(result.message)
              }
            }}
          >
            Delete task
          </button>
        </div>
      </>
    </Modal>
  )
}
