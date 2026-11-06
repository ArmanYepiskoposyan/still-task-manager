import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { addTask, at, installStorageFault, restoreStorage, saved, taskKey, view } from './helpers'
import { filters, populateDaily, showToday, titles } from './organization-helpers'
const errors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const found: string[] = []
  errors.set(page, found)
  page.on('pageerror', (error) => found.push(error.message))
  await page.clock.setFixedTime(new Date(at))
  await page.goto('/')
})
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]))

test('Today groups real deadlines; completing and editing moves tasks, reload preserves data', async ({
  page,
}) => {
  await populateDaily(page)
  await showToday(page)
  await expect(
    page.getByRole('region', { name: 'Overdue', exact: true }).getByRole('checkbox'),
  ).toHaveCount(2)
  await expect(
    page.getByRole('region', { name: 'Due today', exact: true }).getByRole('checkbox'),
  ).toHaveCount(2)
  await expect(
    page.getByRole('button', { name: 'Edit task: Organize the design references' }),
  ).toHaveCount(0)
  await expect(page.getByText('4 of 4 tasks in Today', { exact: true })).toBeVisible()
  await page
    .getByRole('checkbox', { name: 'Complete task: Finish the portfolio outline', exact: true })
    .click()
  await expect(page.getByText('3 of 3 tasks in Today', { exact: true })).toBeVisible()
  await page.reload()
  await showToday(page)
  await expect(
    page.getByRole('button', { name: 'Edit task: Finish the portfolio outline' }),
  ).toHaveCount(0)
  await view(page, 'Completed')
  await page
    .getByRole('checkbox', { name: 'Reopen task: Finish the portfolio outline', exact: true })
    .click()
  await showToday(page)
  await expect(
    page.getByRole('button', { name: 'Edit task: Finish the portfolio outline' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Edit task: Send the portfolio draft' }).click()
  await page.getByLabel('Due date', { exact: false }).fill('2026-11-01')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(
    page.getByText('Task saved. It is outside the current Today results. Find it in All tasks.'),
  ).toBeVisible()
  await page.reload()
  await showToday(page)
  await expect(
    page.getByRole('button', { name: 'Edit task: Send the portfolio draft' }),
  ).toHaveCount(0)
  expect(
    (await saved(page)).find((task) => task.title === 'Send the portfolio draft')?.dueDate,
  ).toBe('2026-11-01')
})
test('undated creation stays out of Today with a useful saved notice and destination', async ({
  page,
}) => {
  await showToday(page)
  await expect(page.getByRole('heading', { name: 'A little breathing room today.' })).toBeVisible()
  await addTask(page, 'An unhurried thought')
  await expect(
    page.getByText('Task saved without a due date. Find it in Open tasks or All tasks.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /^Edit task:/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Show all tasks' }).click()
  await expect(page.getByRole('button', { name: 'Edit task: An unhurried thought' })).toBeVisible()
  expect((await saved(page))[0]?.dueDate).toBeUndefined()
})
test('literal Unicode title/notes search, clear action and no-results recovery do not save preferences', async ({
  page,
}) => {
  await populateDaily(page)
  await addTask(page, 'Բարև 🌿 [a-z].*', { notes: 'Café — Straße' })
  const before = await page.evaluate((key) => localStorage.getItem(key), taskKey)
  const search = page.getByRole('searchbox', { name: 'Search tasks' })
  for (const query of ['  RÉSUMÉ  ', 'Cafe\u0301', 'STRASSE', '[a-z].*', 'ԲԱՐԵՒ']) {
    await search.fill(query)
    await expect(page.getByRole('button', { name: /^Edit task:/ })).toHaveCount(1)
  }
  await search.fill('nothing matches')
  await expect(page.getByRole('heading', { name: 'No matching tasks.' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear search', exact: true }).click()
  await expect(search).toBeFocused()
  await expect(page.getByRole('button', { name: /^Edit task:/ })).toHaveCount(7)
  expect(await page.evaluate((key) => localStorage.getItem(key), taskKey)).toBe(before)
  await page.reload()
  await expect(search).toHaveValue('')
})
test('status, priority, deadline and search combine with AND and never override the view', async ({
  page,
}) => {
  await populateDaily(page)
  await view(page, 'All tasks')
  await filters(page)
  await page.getByLabel('Status', { exact: true }).selectOption('Incomplete')
  await page.getByLabel('Priority filter').selectOption('High')
  await page.getByLabel('Deadline filter').selectOption('Today')
  await page.getByRole('searchbox').fill('portfolio')
  expect(await titles(page)).toEqual(['Send the portfolio draft'])
  await expect(page.getByRole('list', { name: 'Active filters' })).toHaveText([
    'Status: IncompletePriority: HighDue: Today',
  ])
  await page.getByRole('button', { name: /^Filters/ }).click()
  await expect(page.getByRole('list', { name: 'Active filters' })).toBeVisible()
  await page.getByRole('button', { name: 'Reset filters' }).click()
  await expect(page.getByRole('searchbox')).toHaveValue('portfolio')
  await page.getByRole('button', { name: 'Clear search', exact: true }).click()
  await showToday(page)
  await filters(page)
  await page.getByLabel('Status', { exact: true }).selectOption('Completed')
  await expect(page.getByRole('heading', { name: 'No matching tasks.' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Today.' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear search and filters' }).click()
  await expect(page.getByRole('button', { name: /^Edit task:/ })).toHaveCount(4)
})
test('deadline filters have explicit semantics for completed, upcoming and undated tasks', async ({
  page,
}) => {
  await populateDaily(page)
  await view(page, 'All tasks')
  await filters(page)
  for (const [value, expected] of [
    ['Overdue', 2],
    ['Today', 2],
    ['Upcoming', 1],
    ['No due date', 1],
    ['Any', 7],
  ] as const) {
    await page.getByLabel('Deadline filter').selectOption(value)
    await expect(page.getByRole('button', { name: /^Edit task:/ })).toHaveCount(expected)
  }
  await page.getByLabel('Status', { exact: true }).selectOption('Completed')
  await page.getByLabel('Deadline filter').selectOption('Overdue')
  await expect(page.getByRole('button', { name: /^Edit task:/ })).toHaveCount(0)
  await page.getByLabel('Deadline filter').selectOption('Any')
  await expect(
    page.getByRole('button', { name: 'Edit task: Organize the design references' }),
  ).toBeVisible()
})
test('sort controls reorder derived results deterministically and preserve the raw saved document', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-27T08:00:00Z'))
  await addTask(page, 'Zebra', { priority: 'Low' })
  await page.clock.setFixedTime(new Date('2026-10-27T09:00:00Z'))
  await addTask(page, 'Beta', { priority: 'High', dueDate: '2026-10-28' })
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00Z'))
  await addTask(page, 'Alpha', { priority: 'Normal', dueDate: '2026-10-27' })
  const before = await page.evaluate((key) => localStorage.getItem(key), taskKey)
  for (const [sort, expected] of [
    ['due', ['Alpha', 'Beta', 'Zebra']],
    ['priority', ['Beta', 'Alpha', 'Zebra']],
    ['newest', ['Alpha', 'Beta', 'Zebra']],
    ['oldest', ['Zebra', 'Beta', 'Alpha']],
    ['title', ['Alpha', 'Beta', 'Zebra']],
  ] as const) {
    await page.getByLabel('Sort by').selectOption(sort)
    expect(await titles(page)).toEqual(expected)
  }
  expect(await page.evaluate((key) => localStorage.getItem(key), taskKey)).toBe(before)
  await page.reload()
  await expect(page.getByLabel('Sort by')).toHaveValue('due')
})
test('every sort retains distinct Today groups while search/filter changes leave global counts alone', async ({
  page,
}) => {
  await populateDaily(page)
  await showToday(page)
  const summary = await page.getByRole('region', { name: 'Workload summary' }).innerText()
  for (const sort of ['due', 'priority', 'newest', 'oldest', 'title']) {
    await page.getByLabel('Sort by').selectOption(sort)
    await expect(
      page.getByRole('region', { name: 'Overdue', exact: true }).getByRole('checkbox'),
    ).toHaveCount(2)
    await expect(
      page.getByRole('region', { name: 'Due today', exact: true }).getByRole('checkbox'),
    ).toHaveCount(2)
  }
  await page.getByRole('searchbox').fill('portfolio')
  await filters(page)
  await page.getByLabel('Priority filter').selectOption('High')
  expect(await page.getByRole('region', { name: 'Workload summary' }).innerText()).toBe(summary)
  await expect(page.getByText('2 of 4 tasks in Today · Search applied')).toBeVisible()
})
test('editing a draft after a rejected write keeps the failure clear until a successful retry', async ({
  page,
}) => {
  await showToday(page)
  await installStorageFault(page, 'setItem')
  await page.getByRole('button', { name: 'New task', exact: true }).click()
  await page.getByLabel('Task title', { exact: false }).fill('Keep this')
  await page.getByRole('button', { name: 'Create task', exact: true }).click()
  await page.getByLabel('Task title', { exact: false }).fill('Keep the revised draft')
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'You’ve edited it since that attempt',
  )
  await expect(page.getByText(/Task saved without/)).toHaveCount(0)
  expect(await saved(page)).toHaveLength(0)
  await restoreStorage(page)
  await page.getByRole('button', { name: 'Create task', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await saved(page))[0]?.title).toBe('Keep the revised draft')
  await expect(page.getByText(/Task saved without/)).toBeVisible()
})
for (const timezone of ['Asia/Yerevan', 'America/Los_Angeles']) {
  test(`Today follows local midnight and focus in ${timezone}`, async ({ browser }) => {
    const context = await browser.newContext({ timezoneId: timezone })
    const page = await context.newPage()
    const instant = timezone === 'Asia/Yerevan' ? '2026-12-31T19:59:50Z' : '2027-01-01T07:59:50Z'
    // Install before the pause target so protocol latency cannot make it a past time.
    await page.clock.install({ time: new Date(new Date(instant).getTime() - 60_000) })
    await page.clock.pauseAt(new Date(instant))
    await page.goto('http://127.0.0.1:4173')
    await addTask(page, 'Year ending', { dueDate: '2026-12-31' })
    await addTask(page, 'Year beginning', { dueDate: '2027-01-01' })
    await showToday(page)
    await expect(page.getByRole('region', { name: 'Due today', exact: true })).toContainText(
      'Year ending',
    )
    await expect(page.getByRole('button', { name: 'Edit task: Year beginning' })).toHaveCount(0)
    await page.clock.fastForward(11000)
    await expect(page.getByRole('region', { name: 'Overdue', exact: true })).toContainText(
      'Year ending',
    )
    await expect(page.getByRole('region', { name: 'Due today', exact: true })).toContainText(
      'Year beginning',
    )
    await page.clock.setSystemTime(
      new Date(timezone === 'Asia/Yerevan' ? '2027-01-02T08:00:00Z' : '2027-01-02T20:00:00Z'),
    )
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(
      page.getByRole('region', { name: 'Overdue', exact: true }).getByRole('checkbox'),
    ).toHaveCount(2)
    await expect(page.getByRole('region', { name: 'Due today', exact: true })).toHaveCount(0)
    await context.close()
  })
}
for (const width of [1440, 768, 390, 360, 320]) {
  test(`toolbar, active filters and no-results fit ${width}px in both themes with keyboard operation`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await populateDaily(page)
    await showToday(page)
    for (const theme of ['Light theme', 'Dark theme']) {
      await page.getByRole('button', { name: theme, exact: true }).click()
      const toggle = page.getByRole('button', { name: /^Filters/ })
      await toggle.focus()
      if ((await toggle.getAttribute('aria-expanded')) === 'false')
        await page.keyboard.press('Enter')
      await page.getByLabel('Priority filter').selectOption('High')
      await page.getByLabel('Deadline filter').selectOption('Overdue')
      await page.getByLabel('Sort by').selectOption('title')
      await page.getByRole('searchbox').fill('portfolio')
      await expect(
        page.getByRole('button', { name: 'Edit task: Finish the portfolio outline' }),
      ).toBeVisible()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
      for (const label of [
        'Search tasks',
        'Sort by',
        'Priority filter',
        'Deadline filter',
        'Status',
      ]) {
        const control = page.getByLabel(label, { exact: true })
        const box = await control.boundingBox()
        expect(box!.width).toBeGreaterThan(40)
        // Firefox may represent 44 CSS px as 43.99993896484375.
        expect(Math.round(box!.height * 100) / 100).toBeGreaterThanOrEqual(44)
      }
      await page.getByRole('searchbox').fill('no match')
      await expect(page.getByRole('heading', { name: 'No matching tasks.' })).toBeVisible()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
      await page.getByRole('button', { name: 'Clear search and filters' }).click()
      await expect(page.getByRole('button', { name: /^Edit task:/ })).toHaveCount(4)
    }
  })
}
for (const theme of ['Light theme', 'Dark theme']) {
  test(`Phase 3 accessibility in ${theme}`, async ({ page }) => {
    await populateDaily(page)
    await showToday(page)
    await page.getByRole('button', { name: theme, exact: true }).click()
    const scan = async () => {
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(result.violations).toEqual([])
    }
    await scan()
    await filters(page)
    await page.getByLabel('Priority filter').selectOption('High')
    await scan()
    await page.getByRole('searchbox').fill('portfolio')
    await scan()
    await page.getByRole('searchbox').fill('absent')
    await scan()
    await page.getByRole('button', { name: 'Clear search and filters' }).click()
    await page.setViewportSize({ width: 320, height: 900 })
    await scan()
    await view(page, 'Completed')
    await scan()
  })
}
