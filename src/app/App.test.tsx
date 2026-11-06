import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'
import {
  createTaskRepository,
  deserializeTasks,
  TASKS_KEY,
} from '../lib/persistence/taskRepository'
import { useTasks } from '../state/TasksContext'
import { TasksProvider } from '../state/TasksProvider'
const saved = () => deserializeTasks(localStorage.getItem(TASKS_KEY)).tasks
async function create(title = 'A thoughtful task') {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'New task' }))
  await user.type(screen.getByLabelText(/Task title/), title)
  await user.click(screen.getByRole('button', { name: 'Create task' }))
  return user
}
const editButton = (title = 'A thoughtful task') =>
  screen.getByRole('button', { name: `Edit task: ${title}` })

describe('real task workflows', () => {
  it('renders a genuinely empty workspace with no fixture data', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Open tasks.' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Room for a fresh start.' })).toBeVisible()
    expect(saved()).toEqual([])
    expect(localStorage.getItem(TASKS_KEY)).toBeNull()
  })
  it('creates a trimmed task and reloads persisted data on remount', async () => {
    const app = render(<App />)
    await create('  Բարև 🌿  ')
    expect(editButton('Բարև 🌿')).toBeVisible()
    expect(saved()[0]).toMatchObject({ title: 'Բարև 🌿', completed: false, priority: 'Normal' })
    app.unmount()
    render(<App />)
    expect(editButton('Բարև 🌿')).toBeVisible()
  })
  it('rejects a blank title accessibly without writing', async () => {
    render(<App />)
    const user = await create('   ')
    expect(screen.getByText('Give your task a title.')).toBeVisible()
    expect(screen.getByLabelText(/Task title/)).toHaveAttribute('aria-invalid', 'true')
    expect(saved()).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('edits fields while preserving identity and creation time', async () => {
    render(<App />)
    const user = await create()
    const before = saved()[0]!
    await user.click(editButton())
    await user.clear(screen.getByLabelText(/Task title/))
    await user.type(screen.getByLabelText(/Task title/), 'Edited task')
    await user.type(screen.getByLabelText(/Notes/), 'A note\nwith context')
    await user.selectOptions(screen.getByLabelText('Priority'), 'High')
    fireEvent.change(screen.getByLabelText(/Due date/), { target: { value: '2026-11-02' } })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(saved()[0]).toMatchObject({
      id: before.id,
      createdAt: before.createdAt,
      title: 'Edited task',
      notes: 'A note\nwith context',
      priority: 'High',
      dueDate: '2026-11-02',
    })
    expect(screen.getByText('Due Nov 2, 2026')).toBeVisible()
  })
  it('cancel discards edits and resets the editor for other tasks', async () => {
    render(<App />)
    const user = await create('First')
    await create('Second')
    const before = localStorage.getItem(TASKS_KEY)
    await user.click(editButton('First'))
    await user.clear(screen.getByLabelText(/Task title/))
    await user.type(screen.getByLabelText(/Task title/), 'Unsaved')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(localStorage.getItem(TASKS_KEY)).toBe(before)
    expect(editButton('First')).toHaveFocus()
    await user.click(editButton('Second'))
    expect(screen.getByLabelText(/Task title/)).toHaveValue('Second')
  })
  it('completes and reopens with actual counts and timestamps', async () => {
    render(<App />)
    const user = await create()
    await user.click(screen.getByRole('checkbox', { name: 'Complete task: A thoughtful task' }))
    expect(saved()[0]?.completedAt).toBeDefined()
    expect(
      screen.queryByRole('button', { name: 'Edit task: A thoughtful task' }),
    ).not.toBeInTheDocument()
    await user.click(
      within(screen.getByRole('navigation')).getByRole('button', { name: 'Completed, 1 tasks' }),
    )
    await user.click(screen.getByRole('checkbox', { name: 'Reopen task: A thoughtful task' }))
    expect(saved()[0]?.completedAt).toBeUndefined()
    expect(saved()[0]?.completed).toBe(false)
  })
  it('confirms deletion, leaves cancellation unchanged, then deletes only the selected ID', async () => {
    render(<App />)
    const user = await create('Duplicate')
    await create('Duplicate')
    const ids = saved().map((t) => t.id)
    await user.click(screen.getAllByRole('button', { name: 'Delete task: Duplicate' })[0]!)
    expect(screen.getByRole('dialog')).toHaveTextContent('Duplicate')
    expect(screen.getByRole('button', { name: 'Keep task' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Keep task' }))
    expect(saved().map((t) => t.id)).toEqual(ids)
    await user.click(screen.getAllByRole('button', { name: 'Delete task: Duplicate' })[0]!)
    await user.click(screen.getByRole('button', { name: 'Delete task' }))
    expect(saved().map((t) => t.id)).toEqual([ids[1]])
    await waitFor(() => expect(screen.getByRole('button', { name: 'New task' })).toHaveFocus())
  })
  it('does not create duplicates from rapid submit events', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'New task' }))
    await user.type(screen.getByLabelText(/Task title/), 'Once')
    const form = screen.getByLabelText(/Task title/).closest('form')!
    act(() => {
      fireEvent.submit(form)
      fireEvent.submit(form)
    })
    expect(saved()).toHaveLength(1)
  })
})

describe('storage failures and actual recovery', () => {
  it('preserves a failed creation draft and saves it exactly once on retry', async () => {
    render(<App />)
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const user = await create('Keep this draft')
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('wasn’t saved')
    expect(screen.getByLabelText(/Task title/)).toHaveValue('Keep this draft')
    expect(saved()).toHaveLength(0)
    spy.mockRestore()
    await user.click(screen.getByRole('button', { name: 'Create task' }))
    expect(saved()).toHaveLength(1)
    expect(editButton('Keep this draft')).toBeVisible()
  })
  it('preserves the committed task and edited draft when editing fails', async () => {
    render(<App />)
    const user = await create()
    await user.click(editButton())
    await user.type(screen.getByLabelText(/Notes/), 'Do not lose this')
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(saved()[0]?.notes).toBeUndefined()
    expect(screen.getByLabelText(/Notes/)).toHaveValue('Do not lose this')
    spy.mockRestore()
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(saved()[0]?.notes).toBe('Do not lose this')
  })
  it('does not falsely complete or delete on failed writes', async () => {
    render(<App />)
    const user = await create()
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    await user.click(screen.getByRole('checkbox', { name: /Complete task:/ }))
    expect(saved()[0]?.completed).toBe(false)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Delete task: A thoughtful task' }))
    await user.click(screen.getByRole('button', { name: 'Delete task' }))
    expect(saved()).toHaveLength(1)
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(
      'has not been deleted',
    )
    spy.mockRestore()
    await user.click(screen.getByRole('button', { name: 'Delete task' }))
    expect(saved()).toHaveLength(0)
  })
  it.each(['broken', '{"version":2,"tasks":[]}'])(
    'protects unreadable data and recovers after valid storage is restored (%s)',
    async (raw) => {
      localStorage.setItem(TASKS_KEY, raw)
      const spy = vi.spyOn(Storage.prototype, 'setItem')
      render(<App />)
      expect(screen.getByRole('button', { name: 'New task' })).toBeDisabled()
      expect(spy).not.toHaveBeenCalled()
      expect(localStorage.getItem(TASKS_KEY)).toBe(raw)
      localStorage.setItem(TASKS_KEY, '{"version":1,"tasks":[]}')
      await userEvent.setup().click(screen.getByRole('button', { name: 'Retry loading tasks' }))
      expect(screen.getByRole('button', { name: 'New task' })).toBeEnabled()
    },
  )
  it('recovers from unavailable storage without overwriting anything', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Your tasks couldn’t be loaded.' })).toBeVisible()
    spy.mockRestore()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry loading tasks' }))
    expect(screen.getByRole('heading', { name: 'Room for a fresh start.' })).toBeVisible()
    expect(localStorage.getItem(TASKS_KEY)).toBeNull()
  })
  it('blocks a stale-tab mutation and reloads the external workspace', async () => {
    render(<App />)
    const user = await create('Local')
    localStorage.setItem(TASKS_KEY, '{"version":1,"tasks":[]}')
    await user.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('alert')).toHaveTextContent('another tab')
    expect(editButton('Local')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Reload saved tasks' }))
    expect(screen.queryByRole('button', { name: 'Edit task: Local' })).not.toBeInTheDocument()
  })
})

describe('theme and state consistency', () => {
  it('persists an explicit theme and restores it on remount', async () => {
    const app = render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Dark theme' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem('still.theme')).toBe('dark')
    app.unmount()
    render(<App />)
    expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(screen.getByRole('button', { name: 'System theme' }))
    expect(localStorage.getItem('still.theme')).toBe('system')
  })
  it('explains theme persistence failures while applying a session preference', async () => {
    render(<App />)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dark theme' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(screen.getByRole('alert')).toHaveTextContent('for this session')
    expect(localStorage.getItem('still.theme')).toBeNull()
  })
  it('serializes rapid commands against the latest committed snapshot', async () => {
    function Rapid() {
      const tasks = useTasks()
      return (
        <button
          onClick={() => {
            for (let i = 0; i < 3; i++)
              tasks.create({ title: `Task ${i}`, notes: '', priority: 'Normal', dueDate: '' })
          }}
        >
          Rapid
        </button>
      )
    }
    render(
      <TasksProvider repository={createTaskRepository()}>
        <Rapid />
      </TasksProvider>,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Rapid' }))
    expect(saved().map((t) => t.title)).toEqual(['Task 0', 'Task 1', 'Task 2'])
  })
})
