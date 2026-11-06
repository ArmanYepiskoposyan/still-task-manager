export type Shortcut = 'new' | 'search' | 'help'
export function shortcutFor(
  event: KeyboardEvent,
  enabled: boolean,
  modalOpen: boolean,
): Shortcut | null {
  if (
    !enabled ||
    modalOpen ||
    event.defaultPrevented ||
    event.repeat ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  )
    return null
  const target = event.target
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
      ))
  )
    return null
  if (event.key === 'n' && !event.shiftKey) return 'new'
  if (event.key === '/' && !event.shiftKey) return 'search'
  if (event.key === '?') return 'help'
  return null
}
