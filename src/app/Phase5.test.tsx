import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { createTask } from '../domain/task'
import { createBackup } from '../lib/persistence/backup'
import { deserializeTasks, TASKS_KEY } from '../lib/persistence/taskRepository'
const at = '2026-11-02T08:00:00.000Z'
const task = createTask(
  { title: 'Imported 🌿', notes: 'literal <script>', dueDate: '', priority: 'Normal' },
  'imported',
  at,
)
const backup = createBackup({ tasks: [task], projects: [] }, at)
const saved = () => deserializeTasks(localStorage.getItem(TASKS_KEY))
async function preview(text = backup) {
  await userEvent.click(screen.getByRole('button', { name: 'Backup & restore' }))
  await userEvent.upload(
    screen.getByLabelText('Choose JSON file'),
    new File([text], 'backup.json', { type: 'application/json' }),
  )
}
async function confirm() {
  await screen.findByRole('heading', { name: 'Import preview' })
  await userEvent.click(screen.getByRole('checkbox', { name: /I understand/ }))
}
describe('Phase 5 project workflows', () => {
  it('creates, renames, assigns and deletes a project while preserving its task', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'New project' }))
    await userEvent.type(screen.getByLabelText(/Project name/), 'Home')
    await userEvent.click(screen.getByRole('button', { name: 'Create project' }))
    const id = saved().projects[0]!.id
    await userEvent.selectOptions(screen.getByLabelText('PROJECTS'), id)
    await userEvent.click(screen.getByRole('button', { name: 'Edit selected project' }))
    await userEvent.clear(screen.getByLabelText(/Project name/))
    await userEvent.type(screen.getByLabelText(/Project name/), 'Garden')
    await userEvent.click(screen.getByRole('button', { name: 'Save project' }))
    expect(saved().projects[0]?.id).toBe(id)
    await userEvent.click(screen.getByRole('button', { name: 'New task' }))
    expect(screen.getByLabelText(/Project Optional/)).toHaveValue(id)
    await userEvent.type(screen.getByLabelText(/Task title/), 'Grow basil')
    await userEvent.click(screen.getByRole('button', { name: 'Create task' }))
    const before = saved().tasks[0]!
    await userEvent.click(screen.getByRole('button', { name: 'Delete selected project' }))
    expect(screen.getByRole('button', { name: 'Keep project' })).toHaveFocus()
    expect(screen.getByRole('dialog')).toHaveTextContent('No tasks will be deleted')
    await userEvent.click(screen.getByRole('button', { name: 'Delete project' }))
    expect(saved().tasks).toEqual([{ ...before, projectId: undefined }])
    expect(saved().projects).toEqual([])
    expect(screen.getByRole('heading', { name: 'Unassigned.' })).toBeVisible()
  })
  it('retains project name drafts and collections on a failed write', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'New project' }))
    await userEvent.type(screen.getByLabelText(/Project name/), 'Keep this')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await userEvent.click(screen.getByRole('button', { name: 'Create project' }))
    expect(screen.getByLabelText(/Project name/)).toHaveValue('Keep this')
    expect(saved().projects).toEqual([])
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('wasn’t saved')
  })
})
describe('previewed replacement', () => {
  it('focuses the validated import preview when it renders without waiting for an animation frame', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0)
    render(<App />)
    await preview()
    const heading = await screen.findByRole('heading', { name: 'Import preview' })
    expect(heading).toHaveFocus()
    expect(localStorage.getItem(TASKS_KEY)).toBeNull()
  })
  it('requires confirmation and publishes exactly once after persistence', async () => {
    render(<App />)
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    await preview()
    await screen.findByRole('heading', { name: 'Import preview' })
    expect(screen.getByRole('button', { name: 'Replace workspace' })).toBeDisabled()
    expect(localStorage.getItem(TASKS_KEY)).toBeNull()
    await confirm()
    const button = screen.getByRole('button', { name: 'Replace workspace' })
    act(() => {
      fireEvent.click(button)
      fireEvent.click(button)
    })
    expect(writes).toHaveBeenCalledTimes(1)
    expect(saved().tasks).toEqual([task])
    expect(screen.getByRole('button', { name: 'Edit task: Imported 🌿' })).toBeVisible()
  })
  it('does not publish a failed replacement and allows a confirmed retry', async () => {
    render(<App />)
    await preview()
    await confirm()
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await userEvent.click(screen.getByRole('button', { name: 'Replace workspace' }))
    expect(saved().tasks).toEqual([])
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(
      'Nothing was imported',
    )
    expect(screen.getByRole('button', { name: 'Replace workspace' })).toBeDisabled()
    spy.mockRestore()
    await confirm()
    await userEvent.click(screen.getByRole('button', { name: 'Replace workspace' }))
    expect(saved().tasks).toEqual([task])
  })
  it('rejects malformed files without changing saved data', async () => {
    localStorage.setItem(TASKS_KEY, '{"version":1,"tasks":[]}')
    render(<App />)
    await preview('{broken')
    await screen.findByRole('alert')
    expect(localStorage.getItem(TASKS_KEY)).toBe('{"version":1,"tasks":[]}')
    expect(screen.queryByRole('heading', { name: 'Import preview' })).not.toBeInTheDocument()
  })
  it('blocks an external change between preview and confirmation', async () => {
    render(<App />)
    await preview()
    await confirm()
    localStorage.setItem(TASKS_KEY, '{"version":1,"tasks":[]}')
    await userEvent.click(screen.getByRole('button', { name: 'Replace workspace' }))
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('another tab')
    expect(localStorage.getItem(TASKS_KEY)).toBe('{"version":1,"tasks":[]}')
  })
  it.each(['broken', '{"version":999,"tasks":[]}'])(
    'recovers only after explicit replacement from %s',
    async (raw) => {
      localStorage.setItem(TASKS_KEY, raw)
      render(<App />)
      await preview()
      expect(screen.getByRole('button', { name: 'Download backup' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Download raw stored document' })).toBeEnabled()
      expect(localStorage.getItem(TASKS_KEY)).toBe(raw)
      await confirm()
      await userEvent.click(screen.getByRole('button', { name: 'Replace workspace' }))
      expect(saved().tasks).toEqual([task])
      expect(screen.getByRole('button', { name: 'New task' })).toBeEnabled()
    },
  )
})
it('shortcuts focus search, avoid typing and dialogs, restore focus, and can be disabled', async () => {
  render(<App />)
  fireEvent.keyDown(window, { key: '/' })
  expect(screen.getByRole('searchbox')).toHaveFocus()
  await userEvent.type(screen.getByRole('searchbox'), 'n?')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  screen.getByRole('button', { name: 'New task' }).focus()
  fireEvent.keyDown(window, { key: 'n' })
  expect(screen.getByLabelText(/Task title/)).toHaveFocus()
  fireEvent.keyDown(window, { key: '?' })
  expect(screen.getByRole('dialog')).toHaveTextContent('What’s on your mind?')
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'New task' })).toHaveFocus())
  fireEvent.keyDown(window, { key: '?' })
  await userEvent.click(screen.getByRole('checkbox', { name: /Enable single-key/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Close shortcuts' }))
  fireEvent.keyDown(window, { key: 'n' })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
