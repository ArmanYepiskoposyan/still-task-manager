import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { TasksProvider } from '../state/TasksProvider'
import { useTasks } from '../state/TasksContext'
import { createTaskRepository, TASKS_KEY } from '../lib/persistence/taskRepository'

const draft = { title: 'Synthetic task', notes: '', priority: 'Normal' as const, dueDate: '' }
describe('storage event scope and recovery focus', () => {
  it.each(['still.tasks', null])('ignores sessionStorage events for %s', (key) => {
    render(<App />)
    act(() =>
      window.dispatchEvent(new StorageEvent('storage', { key, storageArea: sessionStorage })),
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it.each(['still.tasks', null])('reports localStorage events for %s', (key) => {
    render(<App />)
    act(() => window.dispatchEvent(new StorageEvent('storage', { key, storageArea: localStorage })))
    expect(screen.getByRole('alert')).toHaveTextContent('another tab')
  })
  it('ignores unrelated localStorage keys', () => {
    render(<App />)
    act(() =>
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'still.theme', storageArea: localStorage }),
      ),
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it('does not throw if storage access is revoked during a notification', () => {
    render(<App />)
    const area = localStorage
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() =>
      act(() =>
        window.dispatchEvent(new StorageEvent('storage', { key: TASKS_KEY, storageArea: area })),
      ),
    ).not.toThrow()
  })
  it('restores keyboard focus after successful reload removes its button', async () => {
    render(<App />)
    act(() =>
      window.dispatchEvent(
        new StorageEvent('storage', { key: TASKS_KEY, storageArea: localStorage }),
      ),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Reload saved tasks' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'New task' })).toHaveFocus())
  })
  it('keeps a useful focus target and protects corrupt storage after unsuccessful Retry', async () => {
    localStorage.setItem(TASKS_KEY, 'broken')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Retry loading tasks' }))
    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus())
    expect(localStorage.getItem(TASKS_KEY)).toBe('broken')
    expect(screen.getByRole('button', { name: 'New task' })).toBeDisabled()
  })
})
it('a failed middle command cannot publish or poison the next rapid command', () => {
  let raw: string | null = null
  const writes: string[] = []
  const storage = {
    getItem: () => raw,
    setItem: (_key: string, value: string) => {
      // Committed UI still shows the previous snapshot at each synchronous write.
      expect(screen.getByTestId('committed')).toHaveTextContent('0')
      if (writes.length === 1 && value.includes('Rejected'))
        throw new DOMException('quota', 'QuotaExceededError')
      raw = value
      writes.push(value)
    },
  }
  function Batch() {
    const service = useTasks()
    return (
      <>
        <output data-testid="committed">{service.snapshot?.tasks.length}</output>
        <button
          onClick={() => {
            expect(service.create({ ...draft, title: 'First' }).ok).toBe(true)
            expect(service.create({ ...draft, title: 'Rejected' }).ok).toBe(false)
            expect(service.create({ ...draft, title: 'Last' }).ok).toBe(true)
          }}
        >
          Batch
        </button>
      </>
    )
  }
  render(
    <TasksProvider repository={createTaskRepository(() => storage)}>
      <Batch />
    </TasksProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Batch' }))
  expect(screen.getByTestId('committed')).toHaveTextContent('2')
  expect(writes).toHaveLength(2)
  expect(JSON.parse(raw!).tasks.map((t: { title: string }) => t.title)).toEqual(['First', 'Last'])
})
