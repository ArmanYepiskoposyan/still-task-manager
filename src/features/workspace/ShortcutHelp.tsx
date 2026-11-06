import { useRef } from 'react'
import { Modal } from '../../components/Modal'
export function ShortcutHelp({
  enabled,
  onEnabled,
  onClose,
}: {
  enabled: boolean
  onEnabled: (value: boolean) => void
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  return (
    <Modal
      titleId="shortcuts-title"
      descriptionId="shortcuts-description"
      initialFocus={closeRef}
      onClose={onClose}
    >
      <h2 id="shortcuts-title">A few useful shortcuts.</h2>
      <p id="shortcuts-description" className="muted">
        Available on desktop when you are outside a form or dialog. Your browser’s modifier
        shortcuts are left alone.
      </p>
      <dl className="shortcut-list">
        <div>
          <dt>New task</dt>
          <dd>
            <kbd>N</kbd>
          </dd>
        </div>
        <div>
          <dt>Focus search</dt>
          <dd>
            <kbd>/</kbd>
          </dd>
        </div>
        <div>
          <dt>Show this help</dt>
          <dd>
            <kbd>?</kbd>
          </dd>
        </div>
      </dl>
      <label className="confirmation-check">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabled(event.target.checked)}
        />
        Enable single-key shortcuts for this session
      </label>
      <p className="muted">
        You can turn these off for speech input or your preferred keyboard workflow. Every action is
        also available through a labeled control.
      </p>
      <div className="dialog-actions">
        <button
          ref={closeRef}
          className="button secondary"
          onClick={() => closeRef.current?.closest('dialog')?.close()}
        >
          Close shortcuts
        </button>
      </div>
    </Modal>
  )
}
