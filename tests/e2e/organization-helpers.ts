import { expect, type Page } from '@playwright/test'
import { addTask, at, view } from './helpers'
export async function populateDaily(page: Page) {
  let step = 0
  const add = async (title: string, options: Parameters<typeof addTask>[2]) => {
    await page.clock.setFixedTime(new Date(new Date(at).getTime() + step++ * 60_000))
    await addTask(page, title, options)
  }
  await add('Finish the portfolio outline', {
    priority: 'High',
    dueDate: '2026-10-25',
    notes: 'Shape a clear story. Include the résumé and accessibility findings.',
  })
  await add('Review the accessibility notes', {
    priority: 'Normal',
    dueDate: '2026-10-26',
    notes: 'Check keyboard navigation and readable contrast.',
  })
  await add('Sketch a calmer morning', {
    priority: 'Low',
    dueDate: '2026-10-27',
    notes: 'A little room to begin with intention.',
  })
  await add('Send the portfolio draft', {
    priority: 'High',
    dueDate: '2026-10-27',
    notes: 'Share the thoughtful first version.',
  })
  await add('Plan next week’s reading', { priority: 'Low', dueDate: '2026-10-30' })
  await add('Make room for a new idea', { notes: 'Keep this open, without a deadline.' })
  await add('Organize the design references', { dueDate: '2026-10-24' })
  await page
    .getByRole('checkbox', { name: 'Complete task: Organize the design references', exact: true })
    .click()
}
export async function filters(page: Page) {
  const toggle = page.getByRole('button', { name: /^Filters/ })
  if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click()
}
export async function showToday(page: Page) {
  await view(page, 'Today')
  await expect(page.getByRole('heading', { level: 1, name: 'Today.' })).toBeVisible()
}
export const titles = (page: Page) =>
  page
    .getByRole('button', { name: /^Edit task:/ })
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute('aria-label')!.replace('Edit task: ', '')),
    )
