import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { addTask, at, installStorageFault, restoreStorage, saved, taskKey, view } from './helpers'
import { filters, populateDaily } from './organization-helpers'
import { syntheticTasks } from '../fixtures/tasks'
const errors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const found: string[] = []
  errors.set(page, found)
  page.on('pageerror', (e) => found.push(e.message))
  await page.clock.setFixedTime(new Date(at))
  await page.goto('/')
})
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]))

test('session storage events do not warn; local conflict recovery restores focus', async ({
  page,
}) => {
  for (const key of [taskKey, null])
    await page.evaluate(
      (key) =>
        window.dispatchEvent(new StorageEvent('storage', { key, storageArea: sessionStorage })),
      key,
    )
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.evaluate(
    (key) => window.dispatchEvent(new StorageEvent('storage', { key, storageArea: localStorage })),
    taskKey,
  )
  await expect(page.getByRole('alert')).toContainText('another tab')
  await page.getByRole('button', { name: 'Reload saved tasks' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'New task', exact: true })).toBeFocused()
})
test('Retry focus remains usable on failure and returns to New task after recovery', async ({
  page,
}) => {
  await page.evaluate((key) => localStorage.setItem(key, 'corrupt'), taskKey)
  await page.reload()
  await page.getByRole('button', { name: 'Retry loading tasks', exact: true }).click()
  await expect(page.getByRole('main')).toBeFocused()
  expect(await page.evaluate((key) => localStorage.getItem(key), taskKey)).toBe('corrupt')
  await page.evaluate((key) => localStorage.setItem(key, '{"version":1,"tasks":[]}'), taskKey)
  await page.getByRole('button', { name: 'Retry loading tasks', exact: true }).click()
  await expect(page.getByRole('button', { name: 'New task', exact: true })).toBeFocused()
})
for (const action of ['edit', 'delete'] as const)
  test(`stale ${action} dialog cannot overwrite a task deleted in another tab`, async ({
    page,
    context,
  }) => {
    await addTask(page, 'Shared synthetic task')
    const other = await context.newPage()
    await other.goto('/')
    await page
      .getByRole('button', {
        name: `${action === 'edit' ? 'Edit' : 'Delete'} task: Shared synthetic task`,
        exact: true,
      })
      .click()
    if (action === 'edit')
      await page.getByRole('dialog').getByLabel('Task title').fill('Keep this unsaved draft')
    await other
      .getByRole('button', { name: 'Delete task: Shared synthetic task', exact: true })
      .click()
    await other.getByRole('button', { name: 'Delete task', exact: true }).click()
    await page
      .getByRole('button', {
        name: action === 'edit' ? 'Save changes' : 'Delete task',
        exact: true,
      })
      .click()
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('another tab')
    expect(await saved(page)).toEqual([])
    if (action === 'edit')
      await expect(page.getByRole('dialog').getByLabel('Task title')).toHaveValue(
        'Keep this unsaved draft',
      )
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Reload saved tasks' }).click()
    await expect(page.locator('[data-task-id]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'New task', exact: true })).toBeFocused()
    await other.close()
  })
test('HTML, script, Unicode and hostile-looking notes remain literal across save and reload', async ({
  page,
}) => {
  const title = '<img id="injected" src=x onerror="window.injected=true"> 🌿'
  const notes = '<script>window.injected=true</script>\nԲարև e\u0301 \u202eplain text'
  await addTask(page, title, { notes })
  await page.reload()
  await expect(page.getByRole('button', { name: `Edit task: ${title}`, exact: true })).toBeVisible()
  await page.getByRole('button', { name: `Edit task: ${title}`, exact: true }).click()
  await expect(page.getByRole('dialog').getByLabel('Notes')).toHaveValue(notes)
  expect(await page.locator('#injected').count()).toBe(0)
  expect(await page.evaluate(() => Object.hasOwn(window, 'injected'))).toBe(false)
  await page.keyboard.press('Escape')
  await page.getByRole('searchbox').fill('ԲԱՐԵՒ')
  await expect(page.locator('[data-task-id]')).toHaveCount(1)
})
test('rapid completion and reopening in All tasks preserve the same identity', async ({ page }) => {
  await addTask(page, 'Rapid synthetic task')
  await view(page, 'All tasks')
  const id = (await saved(page))[0]!.id
  for (let i = 0; i < 6; i++) await page.getByRole('checkbox').press('Space')
  expect((await saved(page))[0]).toMatchObject({ id, completed: false })
  await expect(page.getByRole('checkbox')).not.toBeChecked()
  expect((await saved(page))[0]?.completedAt).toBeUndefined()
})
for (const timezoneId of ['Pacific/Kiritimati', 'Pacific/Pago_Pago'])
  test(`deadline display preserves leap days and early years in ${timezoneId}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ timezoneId })
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:4173')
    const tasks = syntheticTasks(2).map((task, i) => ({
      ...task,
      dueDate: i ? '0001-01-01' : '2028-02-29',
    }))
    await page.evaluate(
      (tasks) => localStorage.setItem('still.tasks', JSON.stringify({ version: 1, tasks })),
      tasks,
    )
    await page.reload()
    await expect(page.getByText('Due Feb 29, 2028', { exact: true })).toBeVisible()
    await expect(page.getByText('Due Jan 1, 1', { exact: true })).toBeVisible()
    await context.close()
  })
const longTitle = 'Long synthetic title ' + 'W'.repeat(179)
for (const width of [320, 360, 390, 768, 1024, 1440])
  test(`quality audit at ${width}px: long content, filters, dialogs and both themes`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await populateDaily(page)
    await addTask(page, longTitle, {
      notes: 'N'.repeat(5000),
      priority: 'High',
      dueDate: '2028-02-29',
    })
    const overflow = async () =>
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
    const scan = async () =>
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
            .analyze()
        ).violations,
      ).toEqual([])
    for (const theme of ['Light theme', 'Dark theme']) {
      await page.getByRole('button', { name: theme, exact: true }).click()
      await filters(page)
      await overflow()
      await scan()
      const fits = await page.getByLabel('Sort by').evaluate((element) => {
        const select = element as HTMLSelectElement,
          css = getComputedStyle(select),
          canvas = document.createElement('canvas'),
          ctx = canvas.getContext('2d')!
        ctx.font = css.font
        return Array.from(select.options).every(
          (o) =>
            ctx.measureText(o.text).width +
              parseFloat(css.paddingLeft) +
              parseFloat(css.paddingRight) +
              24 <=
            select.clientWidth,
        )
      })
      expect(fits).toBe(true)
      await page.getByRole('button', { name: `Edit task: ${longTitle}`, exact: true }).click()
      await expect(page.getByRole('dialog').getByLabel('Notes')).toHaveValue('N'.repeat(5000))
      await overflow()
      expect(await page.getByRole('dialog').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
        true,
      )
      await scan()
      await page.keyboard.press('Escape')
      await expect(
        page.getByRole('button', { name: `Edit task: ${longTitle}`, exact: true }),
      ).toBeFocused()
      await page.getByRole('button', { name: `Delete task: ${longTitle}`, exact: true }).click()
      await expect(page.getByRole('button', { name: 'Keep task' })).toBeFocused()
      await overflow()
      await page.getByRole('button', { name: 'Keep task' }).click()
      await page.getByRole('searchbox').fill('absent')
      await overflow()
      await page.getByRole('button', { name: 'Clear search and filters' }).click()
      await expect(page.getByRole('searchbox')).toBeFocused()
    }
  })
test('theme tokens meet text and non-text contrast thresholds', async ({ page }) => {
  for (const theme of ['Light theme', 'Dark theme']) {
    await page.getByRole('button', { name: theme, exact: true }).click()
    const ratios = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      const luminance = (token: string) => {
        const raw = style.getPropertyValue(token).trim()
        const hex = raw.length === 4 ? '#' + [...raw.slice(1)].map((c) => c + c).join('') : raw
        const channels = [1, 3, 5]
          .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
          .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
      }
      const ratio = (a: string, b: string) => {
        const x = luminance(a),
          y = luminance(b)
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
      }
      return {
        text: ['--text', '--muted', '--faint'].flatMap((f) =>
          ['--canvas', '--surface', '--sidebar'].map((b) => ratio(f, b)),
        ),
        status: [
          ratio('--warning', '--warning-soft'),
          ratio('--success', '--success-soft'),
          ratio('--danger', '--danger-soft'),
          ratio('--on-accent', '--accent'),
        ],
        controls: [
          ratio('--control-border', '--surface'),
          ratio('--focus', '--canvas'),
          ratio('--focus', '--surface'),
        ],
      }
    })
    for (const ratio of [...ratios.text, ...ratios.status])
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    for (const ratio of ratios.controls) expect(ratio).toBeGreaterThanOrEqual(3)
  }
})
test('reflow at equivalent 200% and 400% desktop zoom retains dialog actions and failures', async ({
  page,
}) => {
  // 1440/2 and 1280/4 CSS-pixel viewports; this is reflow equivalence, not OS zoom emulation.
  for (const width of [720, 320]) {
    await page.setViewportSize({ width, height: 600 })
    await page.getByRole('button', { name: 'New task', exact: true }).click()
    await page.getByRole('dialog').getByLabel('Task title').fill('Synthetic reflow draft')
    await installStorageFault(page, 'setItem')
    await page.getByRole('button', { name: 'Create task', exact: true }).click()
    await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
    await page.getByRole('button', { name: 'Create task', exact: true }).scrollIntoViewIfNeeded()
    expect(await page.getByRole('dialog').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
      true,
    )
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await restoreStorage(page)
  }
})
