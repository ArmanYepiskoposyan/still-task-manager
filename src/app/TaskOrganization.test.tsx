import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { createTask } from '../domain/task'
import { serializeTasks, TASKS_KEY, deserializeTasks } from '../lib/persistence/taskRepository'
import { localDateKey } from '../lib/dates/calendar'
const at = '2026-10-27T08:00:00.000Z'
function seed() {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const entries = [
    ['late', 'Late outline', 'High', localDateKey(yesterday), 'A résumé to review'],
    ['today', 'Today sketch', 'Low', localDateKey(now), 'Thoughtful notes'],
    ['future', 'Future idea', 'Normal', localDateKey(tomorrow), ''],
    ['none', 'Without deadline', 'Normal', '', ''],
  ] as const
  localStorage.setItem(
    TASKS_KEY,
    serializeTasks(
      entries.map(([id, title, priority, dueDate, notes]) =>
        createTask({ title, priority, dueDate, notes }, id, at),
      ),
    ),
  )
}
const navigation = (name: string) =>
  within(screen.getByRole('navigation')).getByRole('button', { name: new RegExp(`^${name},`) })
const rows = () => screen.queryAllByRole('button', { name: /^Edit task:/ })
const stored = () => localStorage.getItem(TASKS_KEY)
describe('task organization integration', () => {
  it('shows only incomplete overdue and due-today groups in Today', async () => {
    seed()
    render(<App />)
    await userEvent.setup().click(navigation('Today'))
    expect(screen.getByRole('region', { name: 'Overdue' })).toHaveTextContent('Late outline')
    expect(screen.getByRole('region', { name: 'Due today' })).toHaveTextContent('Today sketch')
    expect(rows()).toHaveLength(2)
  })
  it('searches titles and notes without writing storage and can clear the query', async () => {
    seed()
    render(<App />)
    const before = stored()
    const user = userEvent.setup()
    await user.type(screen.getByRole('searchbox', { name: 'Search tasks' }), 'RÉSUMÉ')
    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toHaveTextContent('Late outline')
    expect(screen.getByText('1 of 4 tasks in Open tasks · Search applied')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(rows()).toHaveLength(4)
    expect(stored()).toBe(before)
    expect(screen.getByRole('searchbox')).toHaveFocus()
  })
  it('combines filters with search, keeps them clear when collapsed and resets filters only', async () => {
    seed()
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Filters' }))
    await user.selectOptions(screen.getByLabelText('Priority filter'), 'High')
    await user.selectOptions(screen.getByLabelText('Deadline filter'), 'Overdue')
    await user.type(screen.getByRole('searchbox'), 'outline')
    expect(rows()).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: /Filters/ }))
    expect(screen.getByRole('list', { name: 'Active filters' })).toHaveTextContent('Priority: High')
    await user.click(screen.getByRole('button', { name: 'Reset filters' }))
    expect(screen.getByRole('searchbox')).toHaveFocus()
    expect(screen.getByRole('searchbox')).toHaveValue('outline')
    expect(screen.queryByRole('list', { name: 'Active filters' })).not.toBeInTheDocument()
  })
  it('explains no results without representing the collection as empty', async () => {
    seed()
    render(<App />)
    const user = userEvent.setup()
    await user.type(screen.getByRole('searchbox'), 'absent')
    expect(screen.getByRole('heading', { name: 'No matching tasks.' })).toBeVisible()
    expect(screen.getByText(/workspace may still contain/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Clear search and filters' }))
    expect(screen.getByRole('searchbox')).toHaveFocus()
    expect(rows()).toHaveLength(4)
  })
  it('filters do not override the current view', async () => {
    seed()
    render(<App />)
    const user = userEvent.setup()
    await user.click(navigation('Today'))
    await user.click(screen.getByRole('button', { name: 'Filters' }))
    await user.selectOptions(screen.getByLabelText('Status'), 'Completed')
    expect(rows()).toHaveLength(0)
    expect(navigation('Today')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { name: 'No matching tasks.' })).toBeVisible()
  })
  it('sorts a derived collection while preserving the exact saved document', async () => {
    seed()
    render(<App />)
    const before = stored()
    await userEvent.setup().selectOptions(screen.getByLabelText('Sort by'), 'title')
    expect(rows().map((row) => row.textContent)).toEqual([
      expect.stringContaining('Future idea'),
      expect.stringContaining('Late outline'),
      expect.stringContaining('Today sketch'),
      expect.stringContaining('Without deadline'),
    ])
    expect(stored()).toBe(before)
  })
  it('shows global workload independently of matching result count', async () => {
    seed()
    render(<App />)
    const summary = screen.getByRole('region', { name: 'Workload summary' })
    const before = summary.textContent
    await userEvent.setup().type(screen.getByRole('searchbox'), 'absent')
    expect(summary.textContent).toBe(before)
    expect(summary).toHaveTextContent('Across your workspace')
    expect(screen.getByText('0 of 4 tasks in Open tasks · Search applied')).toBeVisible()
  })
  it('explains a successful undated creation outside Today and reveals it on request', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(navigation('Today'))
    expect(screen.getByRole('heading', { name: 'A little breathing room today.' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'New task' }))
    await user.type(screen.getByLabelText(/Task title/), 'A new idea')
    await user.click(screen.getByRole('button', { name: 'Create task' }))
    expect(screen.getByText(/Task saved without a due date/)).toBeVisible()
    expect(rows()).toHaveLength(0)
    expect(deserializeTasks(stored()).tasks[0]?.dueDate).toBeUndefined()
    await user.click(screen.getByRole('button', { name: 'Show all tasks' }))
    expect(rows()).toHaveLength(1)
  })
  it('completing a Today task removes it and updates global workload', async () => {
    seed()
    render(<App />)
    const user = userEvent.setup()
    await user.click(navigation('Today'))
    await user.click(screen.getByRole('checkbox', { name: 'Complete task: Late outline' }))
    expect(screen.queryByRole('region', { name: 'Overdue' })).not.toBeInTheDocument()
    expect(navigation('Today')).toHaveAccessibleName('Today, 1 tasks')
    await user.click(navigation('Completed'))
    expect(rows()[0]).toHaveTextContent('Late outline')
  })
  it('editing a deadline moves a task outside Today with an honest notice', async () => {
    seed()
    render(<App />)
    const user = userEvent.setup()
    await user.click(navigation('Today'))
    await user.click(screen.getByRole('button', { name: 'Edit task: Today sketch' }))
    fireEvent.change(screen.getByLabelText(/Due date/), { target: { value: '' } })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByText(/Task saved without a due date/)).toBeVisible()
    expect(rows()).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'New task' })).toHaveFocus()
  })
  it('retains failure information and distinguishes edits after a failed save', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'New task' }))
    await user.type(screen.getByLabelText(/Task title/), 'Original draft')
    const failure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    await user.click(screen.getByRole('button', { name: 'Create task' }))
    await user.type(screen.getByLabelText(/Task title/), ' changed')
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(
      'You’ve edited it since that attempt',
    )
    expect(stored()).toBeNull()
    failure.mockRestore()
    await user.click(screen.getByRole('button', { name: 'Create task' }))
    expect(rows()[0]).toHaveTextContent('Original draft changed')
  })
})
