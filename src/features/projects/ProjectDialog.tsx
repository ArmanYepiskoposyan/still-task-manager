import { useRef, useState } from 'react'
import { Modal } from '../../components/Modal'
import { Icon } from '../../components/Icon'
import type { Project } from '../../domain/project'
import { useTasks } from '../../state/TasksContext'

export function ProjectDialog({
  project,
  deleting = false,
  onClose,
  onDeleted,
}: {
  project: Project | null
  deleting?: boolean
  onClose: () => void
  onDeleted: () => void
}) {
  const service = useTasks()
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const submitted = useRef(false)
  const [name, setName] = useState(project?.name ?? '')
  const [error, setError] = useState('')
  const close = () => (deleting ? cancelRef : inputRef).current?.closest('dialog')?.close()
  const save = () => {
    if (submitted.current) return
    submitted.current = true
    const result =
      deleting && project
        ? service.deleteProject(project.id)
        : project
          ? service.renameProject(project.id, name)
          : service.createProject(name)
    if (result.ok) {
      if (deleting) onDeleted()
      close()
    } else {
      submitted.current = false
      setError(result.message)
      inputRef.current?.focus()
    }
  }
  const count = service.snapshot?.tasks.filter((task) => task.projectId === project?.id).length ?? 0
  return (
    <Modal
      titleId="project-title"
      descriptionId="project-description"
      initialFocus={deleting ? cancelRef : inputRef}
      onClose={onClose}
    >
      <div className="dialog-heading">
        <span className="eyebrow">A PLACE FOR YOUR PLANS</span>
        <button
          className="icon-button close-dialog"
          aria-label="Close project dialog"
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      <h2 id="project-title">
        {deleting ? 'Delete this project?' : project ? 'Edit project.' : 'Create a project.'}
      </h2>
      <p id="project-description" className="muted">
        {deleting
          ? `“${project?.name}” will be removed. Its ${count} ${count === 1 ? 'task becomes' : 'tasks become'} unassigned. No tasks will be deleted.`
          : 'A simple home for related tasks. Names must be unique, ignoring letter case.'}
      </p>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        {!deleting && (
          <>
            <label htmlFor="project-name">
              Project name <span className="optional">Required · 80 characters maximum</span>
            </label>
            <input
              ref={inputRef}
              id="project-name"
              value={name}
              maxLength={80}
              required
              aria-invalid={!!error}
              aria-describedby={error ? 'project-error' : undefined}
              onChange={(event) => {
                setName(event.target.value)
                setError('')
              }}
            />
          </>
        )}
        {error && (
          <p id="project-error" className="error-detail" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="button secondary" onClick={close}>
            {deleting ? 'Keep project' : 'Cancel'}
          </button>
          <button type="submit" className={`button ${deleting ? 'danger' : 'primary'}`}>
            {deleting ? 'Delete project' : project ? 'Save project' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
