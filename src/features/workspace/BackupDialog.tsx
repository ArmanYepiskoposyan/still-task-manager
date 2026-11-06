import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Modal } from '../../components/Modal'
import { Icon } from '../../components/Icon'
import { downloadText, readBackupFile } from '../../lib/persistence/backup'
import type { WorkspaceData } from '../../domain/project'
import { useTasks } from '../../state/TasksContext'

export function BackupDialog({
  onClose,
  onRestored,
}: {
  onClose: () => void
  onRestored: () => void
}) {
  const service = useTasks()
  const closeRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLHeadingElement>(null)
  const submitted = useRef(false)
  const sequence = useRef(0)
  const [source] = useState(() => {
    try {
      return { raw: service.readRaw(), error: '' }
    } catch (error) {
      return {
        raw: undefined,
        error: error instanceof Error ? error.message : 'Storage is unavailable.',
      }
    }
  })
  const [preview, setPreview] = useState<WorkspaceData | null>(null)
  const [filename, setFilename] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(source.error)
  const [message, setMessage] = useState('')
  useLayoutEffect(() => {
    if (preview) confirmRef.current?.focus()
  }, [preview])
  useEffect(
    () => () => {
      sequence.current++
    },
    [],
  )
  const close = () => closeRef.current?.closest('dialog')?.close()
  const report = (error: unknown) =>
    setError(error instanceof Error ? error.message : 'The operation could not be completed.')
  const choose = async (file?: File) => {
    const attempt = ++sequence.current
    setPreview(null)
    setConfirmed(false)
    setError('')
    setMessage('')
    setFilename(file?.name ?? '')
    if (!file) {
      setBusy(false)
      return
    }
    setBusy(true)
    try {
      const data = await readBackupFile(file)
      if (attempt !== sequence.current) return
      setPreview(data)
    } catch (error) {
      if (attempt === sequence.current) report(error)
    } finally {
      if (attempt === sequence.current) setBusy(false)
    }
  }
  const restore = () => {
    if (!preview || !confirmed || submitted.current || source.raw === undefined) return
    submitted.current = true
    const result = service.replace(preview, source.raw)
    if (result.ok) {
      onRestored()
      close()
    } else {
      submitted.current = false
      setConfirmed(false)
      setError(result.message)
    }
  }
  return (
    <Modal
      titleId="backup-title"
      descriptionId="backup-description"
      initialFocus={closeRef}
      onClose={onClose}
    >
      <div className="dialog-heading">
        <span className="eyebrow">KEEP A COPY, KEEP SOME PEACE</span>
        <button
          ref={closeRef}
          className="icon-button close-dialog"
          onClick={close}
          aria-label="Close backup and restore"
        >
          <Icon name="close" />
        </button>
      </div>
      <h2 id="backup-title">Backup & restore.</h2>
      <p id="backup-description" className="muted">
        Your workspace lives only in this browser on this device. Clearing browser data removes it.
        Keep backups somewhere safe; they contain your task and project text.
      </p>
      <section className="backup-section" aria-labelledby="export-title">
        <h3 id="export-title">Take a copy</h3>
        <p>
          Export all saved tasks and projects as JSON. Theme settings are excluded. Backups are not
          encrypted.
        </p>
        <button
          className="button secondary"
          disabled={!!service.loadError}
          onClick={() => {
            try {
              downloadText(
                service.exportBackup(),
                `still-backup-${new Date().toISOString().slice(0, 10)}.json`,
              )
              setError('')
              setMessage('Backup download requested. Check your browser’s downloads.')
            } catch (error) {
              report(error)
            }
          }}
        >
          Download backup
        </button>
        <button
          className="text-button raw-download"
          disabled={source.raw === undefined || source.raw === null}
          onClick={() => {
            if (source.raw != null) {
              downloadText(
                source.raw,
                `still-recovery-${new Date().toISOString().slice(0, 10)}.txt`,
                'text/plain',
              )
              setMessage('Untouched stored document download requested.')
            }
          }}
        >
          Download raw stored document
        </button>
      </section>
      <section className="backup-section" aria-labelledby="restore-title">
        <h3 id="restore-title">Restore from a file</h3>
        <p>
          Replace this entire workspace. Nothing is merged. Choose a Still JSON backup or a
          version-1 or version-2 workspace document, up to 10 MiB (10,485,760 bytes).
        </p>
        {service.loadError && (
          <p className="recovery-warning">
            The current data cannot be loaded. Download its raw document before replacing it.
            Unknown structures will not be repaired automatically.
          </p>
        )}
        <label htmlFor="backup-file">Choose JSON file</label>
        <input
          id="backup-file"
          type="file"
          accept=".json,application/json,.txt,text/plain"
          disabled={source.raw === undefined}
          onChange={(event) => {
            void choose(event.target.files?.[0])
          }}
        />
        {busy && <p role="status">Validating the complete file…</p>}
        {preview && (
          <div className="import-preview">
            <h3 ref={confirmRef} tabIndex={-1}>
              Import preview
            </h3>
            <p className="backup-filename">{filename}</p>
            <dl className="import-counts">
              <div>
                <dt>Tasks</dt>
                <dd>{preview.tasks.length}</dd>
              </div>
              <div>
                <dt>Projects</dt>
                <dd>{preview.projects.length}</dd>
              </div>
            </dl>
            <p>
              All existing tasks and projects will be replaced by these {preview.tasks.length} tasks
              and {preview.projects.length} projects. This cannot be undone here. Export a backup
              first if you want to keep the current workspace.
            </p>
            <label className="confirmation-check">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              I understand that this replaces all current tasks and projects.
            </label>
            <button
              className="button danger"
              disabled={!confirmed || busy || source.raw === undefined}
              onClick={restore}
            >
              Replace workspace
            </button>
          </div>
        )}
      </section>
      {error && (
        <p className="error-detail" role="alert">
          {error} Nothing was imported. Close this panel and reload saved tasks after resolving
          storage conflicts.
        </p>
      )}
      {message && (
        <p role="status" className="backup-status">
          {message}
        </p>
      )}
      <div className="dialog-actions">
        <button className="button secondary" onClick={close}>
          Done
        </button>
      </div>
    </Modal>
  )
}
