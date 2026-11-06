import { useEffect, useRef } from 'react'
import type { KeyboardEvent, ReactNode, RefObject } from 'react'

export function Modal({
  titleId,
  descriptionId,
  initialFocus,
  onClose,
  children,
}: {
  titleId: string
  descriptionId: string
  initialFocus: RefObject<HTMLElement | null>
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog?.showModal()
    initialFocus.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      dialog?.close()
    }
  }, [initialFocus])
  const containTab = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return
    const controls = event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]',
    )
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }
  return (
    <dialog
      ref={ref}
      className="task-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onKeyDown={containTab}
      onCancel={(event) => {
        // Commit Escape closure with React immediately, before the next shortcut.
        event.preventDefault()
        onClose()
      }}
      onClose={() => {
        if (!ref.current?.open) onClose()
      }}
    >
      {children}
    </dialog>
  )
}
