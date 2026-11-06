import { expect, type Page } from '@playwright/test'
import type { Task } from '../../src/domain/task'
export const taskKey = 'still.tasks'
export const at = '2026-10-27T08:00:00.000Z'
export async function saved(page: Page): Promise<Task[]> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{"tasks":[]}').tasks,
    taskKey,
  )
}
export async function addTask(
  page: Page,
  title: string,
  options: { notes?: string; priority?: string; dueDate?: string } = {},
) {
  await page.getByRole('button', { name: 'New task', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Task title', { exact: false }).fill(title)
  if (options.notes)
    await page.getByRole('dialog').getByLabel('Notes', { exact: false }).fill(options.notes)
  if (options.priority)
    await page
      .getByRole('dialog')
      .getByLabel('Priority', { exact: true })
      .selectOption(options.priority)
  if (options.dueDate)
    await page.getByRole('dialog').getByLabel('Due date', { exact: false }).fill(options.dueDate)
  await page.getByRole('button', { name: 'Create task', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}
export async function view(page: Page, name: string) {
  await page
    .getByRole('navigation')
    .getByRole('button', { name: new RegExp(`^${name},`) })
    .click()
}

export async function installStorageFault(
  page: Page,
  operation: 'getItem' | 'setItem',
  error = 'QuotaExceededError',
  key = taskKey,
) {
  await page.evaluate(
    ({ operation, error, key }) => {
      const original = Storage.prototype[operation]
      Object.defineProperty(Storage.prototype, operation, {
        configurable: true,
        writable: true,
        value: function (this: Storage, name: string, value?: string) {
          if (name === key)
            throw new DOMException('Injected storage failure for verification', error)
          return operation === 'getItem'
            ? (original as Storage['getItem']).call(this, name)
            : (original as Storage['setItem']).call(this, name, value!)
        },
      })
      Object.assign(window, {
        restoreStorage: () => {
          Object.defineProperty(Storage.prototype, operation, {
            configurable: true,
            writable: true,
            value: original,
          })
        },
      })
    },
    { operation, error, key },
  )
}
export async function restoreStorage(page: Page) {
  await page.evaluate(() => (window as unknown as { restoreStorage: () => void }).restoreStorage())
}
export async function populate(page: Page) {
  await addTask(page, 'Polish the portfolio case study', {
    priority: 'High',
    dueDate: '2026-10-30',
    notes: 'Tighten the opening story and add the final accessibility findings.',
  })
  await addTask(page, 'Read a chapter of Creative Confidence', {
    priority: 'Low',
    notes: 'A little room for a new perspective.',
  })
  await addTask(page, 'Plan a thoughtful week', { dueDate: '2026-11-02' })
  await addTask(page, 'Take a walk without a screen', { priority: 'Low' })
  await addTask(page, 'Organize the design references')
  await page
    .getByRole('checkbox', { name: 'Complete task: Organize the design references', exact: true })
    .click()
  expect(
    (await saved(page)).find((task) => task.title === 'Organize the design references')?.completed,
  ).toBe(true)
}
