import { act, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useLocalDate } from './useLocalDate'
function DateProbe() {
  return <span>{useLocalDate()}</span>
}
it('updates the local date at midnight and when focus returns after a clock change', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59, 500))
  render(<DateProbe />)
  expect(screen.getByText('2026-12-31')).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(600))
  expect(screen.getByText('2027-01-01')).toBeInTheDocument()
  act(() => {
    vi.setSystemTime(new Date(2027, 0, 3, 12))
    window.dispatchEvent(new Event('focus'))
  })
  expect(screen.getByText('2027-01-03')).toBeInTheDocument()
})
