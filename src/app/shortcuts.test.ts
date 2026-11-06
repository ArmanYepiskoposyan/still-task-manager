import { describe, expect, it } from 'vitest'
import { shortcutFor } from './shortcuts'
describe('shortcut guards', () => {
  it.each([
    ['n', 'new'],
    ['/', 'search'],
    ['?', 'help'],
  ])('maps %s without platform modifiers', (key, action) => {
    expect(shortcutFor(new KeyboardEvent('keydown', { key }), true, false)).toBe(action)
  })
  it.each([
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { repeat: true },
    { isComposing: true },
    { shiftKey: true },
  ])('ignores modified, repeated or composing new-task input %j', (flags) => {
    expect(
      shortcutFor(new KeyboardEvent('keydown', { key: 'n', ...flags }), true, false),
    ).toBeNull()
  })
  it('supports disabling and suppresses all shortcuts in dialogs', () => {
    const event = new KeyboardEvent('keydown', { key: '/' })
    expect(shortcutFor(event, false, false)).toBeNull()
    expect(shortcutFor(event, true, true)).toBeNull()
  })
  it.each(['input', 'textarea', 'select', 'div'])('does not trigger while editing %s', (tag) => {
    const target = document.createElement(tag)
    if (tag === 'div') target.setAttribute('contenteditable', 'true')
    const event = new KeyboardEvent('keydown', { key: 'n' })
    Object.defineProperty(event, 'target', { value: target })
    expect(shortcutFor(event, true, false)).toBeNull()
  })
})
