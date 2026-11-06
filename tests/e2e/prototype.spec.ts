import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { addTask, at, installStorageFault, restoreStorage, saved, taskKey, view } from './helpers'

const browserErrors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  browserErrors.set(page, errors)
  page.on('pageerror', (error) => errors.push(error.message))
  await page.clock.setFixedTime(new Date(at))
  await page.goto('/')
})

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([])
})

for (const width of [1440, 390]) {
  test(`full lifecycle survives refresh after every major operation at ${width}px without browser errors`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await expect(page.getByRole('heading', { name: 'Room for a fresh start.' })).toBeVisible()
    expect(await saved(page)).toEqual([])
    await addTask(page, '  Բարև 🌿  ', {
      notes: 'Context\nA second line',
      priority: 'High',
      dueDate: '2026-11-02',
    })
    const first = (await saved(page))[0]!
    expect(first).toMatchObject({
      title: 'Բարև 🌿',
      completed: false,
      createdAt: at,
      updatedAt: at,
    })
    await page.reload()
    await expect(page.getByRole('button', { name: 'Edit task: Բարև 🌿' })).toBeVisible()
    await page.clock.setFixedTime(new Date('2026-10-27T09:00:00Z'))
    await page.getByRole('button', { name: 'Edit task: Բարև 🌿' }).click()
    await page.getByLabel('Task title', { exact: false }).fill('Thoughtfully edited')
    await page.getByLabel('Notes', { exact: false }).fill('Changed notes')
    await page.getByLabel('Priority', { exact: true }).selectOption('Low')
    await page.getByLabel('Due date', { exact: false }).fill('2027-01-01')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.reload()
    expect((await saved(page))[0]).toMatchObject({
      id: first.id,
      createdAt: first.createdAt,
      updatedAt: '2026-10-27T09:00:00.000Z',
      title: 'Thoughtfully edited',
      notes: 'Changed notes',
      priority: 'Low',
      dueDate: '2027-01-01',
    })
    for (let i = 0; i < 2; i++) {
      await page.getByRole('checkbox', { name: 'Complete task: Thoughtfully edited' }).click()
      await expect(page.getByRole('button', { name: 'New task', exact: true })).toBeFocused()
      await page.reload()
      await view(page, 'Completed')
      await expect(page.getByRole('checkbox')).toBeChecked()
      expect((await saved(page))[0]?.completedAt).toBe('2026-10-27T09:00:00.000Z')
      await page.getByRole('checkbox', { name: 'Reopen task: Thoughtfully edited' }).click()
      await page.reload()
      expect((await saved(page))[0]?.completedAt).toBeUndefined()
      await expect(page.getByRole('checkbox')).not.toBeChecked()
    }
    await page.getByRole('checkbox').click()
    await view(page, 'Completed')
    await page.getByRole('button', { name: 'Delete task: Thoughtfully edited' }).click()
    await expect(page.getByRole('dialog')).toContainText('Thoughtfully edited')
    await expect(page.getByRole('button', { name: 'Keep task' })).toBeFocused()
    await page.getByRole('button', { name: 'Delete task', exact: true }).click()
    await expect(page.getByRole('button', { name: 'New task', exact: true })).toBeFocused()
    await page.reload()
    expect(await saved(page)).toEqual([])
    await expect(page.getByRole('heading', { name: 'Room for a fresh start.' })).toBeVisible()
    expect(errors).toEqual([])
  })
}

test('duplicate titles have distinct IDs; no-op editing and cancellation preserve saved data', async ({
  page,
}) => {
  await addTask(page, 'Same title')
  await addTask(page, 'Same title')
  const before = await saved(page)
  expect(before[0]!.id).not.toBe(before[1]!.id)
  await page.clock.setFixedTime(new Date('2026-10-28T08:00:00Z'))
  await page.getByRole('button', { name: 'Edit task: Same title' }).first().click()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await saved(page)).toEqual(before)
  await page.getByRole('button', { name: 'Edit task: Same title' }).first().click()
  await page.getByLabel('Task title', { exact: false }).fill('Unsaved')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Edit task: Same title' }).first()).toBeFocused()
  await page.getByRole('button', { name: 'Edit task: Same title' }).last().click()
  await expect(page.getByLabel('Task title', { exact: false })).toHaveValue('Same title')
  await page.keyboard.press('Escape')
  const selectedId = await page
    .getByRole('button', { name: 'Delete task: Same title' })
    .first()
    .evaluate((button) => button.closest('li')!.getAttribute('data-task-id'))
  await page.getByRole('button', { name: 'Delete task: Same title' }).first().click()
  await page.getByRole('button', { name: 'Keep task' }).click()
  expect(await saved(page)).toEqual(before)
  await page.getByRole('button', { name: 'Delete task: Same title' }).first().click()
  await page.getByRole('button', { name: 'Delete task', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await saved(page)).map((task) => task.id)).toEqual(
    before.filter((task) => task.id !== selectedId).map((task) => task.id),
  )
})

test('form limits, whitespace validation and rapid submit protection', async ({ page }) => {
  await page.getByRole('button', { name: 'New task', exact: true }).click()
  const title = page.getByLabel('Task title', { exact: false })
  await title.fill('   ')
  await page.getByRole('button', { name: 'Create task', exact: true }).click()
  await expect(title).toHaveAttribute('aria-invalid', 'true')
  await expect(title).toBeFocused()
  await expect(page.getByRole('alert')).toHaveText('Give your task a title.')
  expect(await saved(page)).toHaveLength(0)
  await expect(title).toHaveAttribute('maxlength', '200')
  await expect(page.getByLabel('Notes', { exact: false })).toHaveAttribute('maxlength', '5000')
  await title.fill('界'.repeat(200))
  await page.getByLabel('Notes', { exact: false }).fill('n'.repeat(5000))
  await page.locator('form').evaluate((form) => {
    ;(form as HTMLFormElement).requestSubmit()
    ;(form as HTMLFormElement).requestSubmit()
  })
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await saved(page)).toHaveLength(1)
  expect((await saved(page))[0]?.notes).toHaveLength(5000)
  await page.reload()
  await expect(page.getByRole('button', { name: /^Edit task:/ })).toHaveCount(1)
})

test('keyboard editor focus wraps; Escape and cancel restore the opener', async ({ page }) => {
  const opener = page.getByRole('button', { name: 'New task', exact: true })
  await opener.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Task title', { exact: false })).toBeFocused()
  await page.getByRole('button', { name: 'Create task', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Close task editor' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Create task', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(opener).toBeFocused()
  await addTask(page, 'Keyboard task')
  await page.getByRole('button', { name: 'Delete task: Keyboard task' }).click()
  await page.getByRole('button', { name: 'Delete task', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Close deletion confirmation' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Delete task: Keyboard task' })).toBeFocused()
})

test('quota failures preserve create/edit drafts and committed tasks; retry genuinely saves', async ({
  page,
}) => {
  await installStorageFault(page, 'setItem')
  await page.getByRole('button', { name: 'New task', exact: true }).click()
  await page.getByLabel('Task title', { exact: false }).fill('Keep my draft')
  await page.getByRole('button', { name: 'Create task', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Your draft is still here',
  )
  expect(await saved(page)).toEqual([])
  await expect(page.getByLabel('Task title', { exact: false })).toHaveValue('Keep my draft')
  await restoreStorage(page)
  await page.getByRole('button', { name: 'Create task', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Edit task: Keep my draft' }).click()
  await page.getByLabel('Notes', { exact: false }).fill('Keep these details')
  await installStorageFault(page, 'setItem', 'SecurityError')
  await page.getByRole('button', { name: 'Save changes' }).click()
  expect((await saved(page))[0]?.notes).toBeUndefined()
  await expect(page.getByLabel('Notes', { exact: false })).toHaveValue('Keep these details')
  await restoreStorage(page)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  expect((await saved(page))[0]?.notes).toBe('Keep these details')
})

test('failed completion and deletion never show success and can be retried', async ({ page }) => {
  await addTask(page, 'A saved task')
  await installStorageFault(page, 'setItem')
  await page.getByRole('checkbox').click()
  await expect(page.getByRole('checkbox')).not.toBeChecked()
  expect((await saved(page))[0]?.completed).toBe(false)
  await expect(page.getByRole('alert')).toContainText('wasn’t saved')
  await restoreStorage(page)
  await page.getByRole('checkbox').click()
  await view(page, 'Completed')
  await page.getByRole('button', { name: 'Delete task: A saved task' }).click()
  await installStorageFault(page, 'setItem')
  await page.getByRole('button', { name: 'Delete task', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('has not been deleted')
  expect(await saved(page)).toHaveLength(1)
  await restoreStorage(page)
  await page.getByRole('button', { name: 'Delete task', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  expect(await saved(page)).toEqual([])
})

for (const raw of [
  'broken JSON',
  '{"version":2,"tasks":[]}',
  '{"version":1,"tasks":[{"title":"invalid"}]}',
]) {
  test(`invalid stored document is protected; retry reloads recovered data: ${raw}`, async ({
    page,
  }) => {
    await page.evaluate(({ taskKey, raw }) => localStorage.setItem(taskKey, raw), { taskKey, raw })
    await page.reload()
    await expect(
      page.getByRole('heading', { name: 'Your tasks couldn’t be loaded.' }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'New task', exact: true })).toBeDisabled()
    await page.getByRole('button', { name: 'Retry loading tasks' }).click()
    expect(await page.evaluate((key) => localStorage.getItem(key), taskKey)).toBe(raw)
    await page.evaluate((key) => localStorage.setItem(key, '{"version":1,"tasks":[]}'), taskKey)
    await page.getByRole('button', { name: 'Retry loading tasks' }).click()
    await addTask(page, 'Recovered workspace')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Edit task: Recovered workspace' })).toBeVisible()
  })
}

test('unavailable browser storage recovers through Retry without an automatic reset', async ({
  page,
}) => {
  await addTask(page, 'Still saved')
  await installStorageFault(page, 'getItem', 'SecurityError')
  await page.getByRole('checkbox').click()
  await page.getByRole('button', { name: 'Reload saved tasks' }).click()
  await expect(page.getByRole('heading', { name: 'Your tasks couldn’t be loaded.' })).toBeVisible()
  await restoreStorage(page)
  await page.getByRole('button', { name: 'Retry loading tasks' }).click()
  await expect(page.getByRole('checkbox')).not.toBeChecked()
  expect((await saved(page))[0]?.title).toBe('Still saved')
})

test('a second tab cannot silently replace a newer saved workspace', async ({ page, context }) => {
  await addTask(page, 'Original')
  const other = await context.newPage()
  await other.goto('/')
  await addTask(other, 'From another tab')
  await expect(page.getByRole('alert')).toContainText('another tab')
  await page.getByRole('checkbox').click()
  await expect(page.getByRole('checkbox')).not.toBeChecked()
  expect(await saved(page)).toHaveLength(2)
  await page.getByRole('button', { name: 'Reload saved tasks' }).click()
  await expect(page.getByRole('button', { name: /^Edit task:/ })).toHaveCount(2)
  await other.close()
})

test('all themes persist, System reacts to OS changes, and pre-React bootstrap applies the stored theme', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  for (const theme of ['Light', 'Dark', 'System']) {
    await page.getByRole('button', { name: `${theme} theme`, exact: true }).click()
    await page.reload()
    await expect(page.getByRole('button', { name: `${theme} theme`, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(await page.evaluate(() => localStorage.getItem('still.theme'))).toBe(theme.toLowerCase())
  }
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
  await page.route('**/assets/*.js', (route) => route.abort())
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('#root')).toBeEmpty()
})

test('theme write failure is honest and does not prevent task use', async ({ page }) => {
  await installStorageFault(page, 'setItem', 'QuotaExceededError', 'still.theme')
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('for this session')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await addTask(page, 'A working task')
  expect(await saved(page)).toHaveLength(1)
})

test('large collection loads, counts and edits by stable identity', async ({ page }) => {
  await page.evaluate(
    ({ taskKey, at }) =>
      localStorage.setItem(
        taskKey,
        JSON.stringify({
          version: 1,
          tasks: Array.from({ length: 2000 }, (_, i) => ({
            id: `load-${i}`,
            title: `Task ${i}`,
            completed: false,
            priority: 'Normal',
            createdAt: at,
            updatedAt: at,
          })),
        }),
      ),
    { taskKey, at },
  )
  await page.reload()
  await expect(page.getByRole('button', { name: /^Edit task:/ })).toHaveCount(2000)
  await expect(
    page.getByRole('navigation').getByRole('button', { name: 'Open tasks, 2000 tasks' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Edit task: Task 1999', exact: true }).click()
  await page.getByLabel('Task title', { exact: false }).fill('Last task edited')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await saved(page))[1999]).toMatchObject({ id: 'load-1999', title: 'Last task edited' })
})

test('local date follows the calendar boundary in a positive UTC offset', async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: 'Asia/Yerevan' })
  const local = await context.newPage()
  await local.clock.install({ time: new Date('2026-12-31T19:58:59.500Z') })
  await local.clock.pauseAt(new Date('2026-12-31T19:59:59.500Z'))
  await local.goto('http://127.0.0.1:4173')
  await expect(local.locator('time')).toHaveAttribute('datetime', '2026-12-31')
  await local.clock.fastForward(1000)
  await expect(local.locator('time')).toHaveAttribute('datetime', '2027-01-01')
  await context.close()
})

test('skip link moves keyboard focus to main content', async ({ page, browserName }) => {
  await page.keyboard.press(
    browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab',
  )
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
})

for (const width of [1440, 768, 390, 360, 320]) {
  test(`real workspace and dialogs fit at ${width}px in both themes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const fit = async () =>
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
    for (const theme of ['Light theme', 'Dark theme']) {
      await page.getByRole('button', { name: theme, exact: true }).click()
      await fit()
      await addTask(page, 'W'.repeat(200), {
        notes: 'n'.repeat(5000),
        dueDate: '2026-11-02',
        priority: 'High',
      })
      await fit()
      await page.getByRole('button', { name: /^Edit task:/ }).click()
      const dialog = page.getByRole('dialog')
      expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
      const box = await dialog.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1)
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: /^Delete task:/ }).click()
      await fit()
      expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
      await page.getByRole('button', { name: 'Delete task', exact: true }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await fit()
    }
    await installStorageFault(page, 'getItem', 'SecurityError')
    await page.getByRole('button', { name: 'New task', exact: true }).click()
    await page.getByLabel('Task title', { exact: false }).fill('Retained draft')
    await page.getByRole('button', { name: 'Create task', exact: true }).click()
    await fit()
    expect(await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    )
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Reload saved tasks' }).click()
    await fit()
    await expect(
      page.getByRole('heading', { name: 'Your tasks couldn’t be loaded.' }),
    ).toBeVisible()
  })
}

for (const theme of ['Light theme', 'Dark theme']) {
  test(`accessibility: empty, create, populated, edit, delete, failed save, mobile, storage error — ${theme}`, async ({
    page,
  }) => {
    await page.getByRole('button', { name: theme, exact: true }).click()
    const scan = async () => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(results.violations).toEqual([])
    }
    await scan()
    await page.getByRole('button', { name: 'New task', exact: true }).click()
    await scan()
    await page.keyboard.press('Escape')
    await addTask(page, 'An accessible task', { priority: 'High', dueDate: '2026-11-02' })
    await scan()
    await page.getByRole('button', { name: /^Edit task:/ }).click()
    await scan()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: /^Delete task:/ }).click()
    await scan()
    await installStorageFault(page, 'setItem')
    await page.getByRole('button', { name: 'Delete task', exact: true }).click()
    await scan()
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 360, height: 900 })
    await scan()
    await restoreStorage(page)
    await installStorageFault(page, 'getItem', 'SecurityError')
    await page.getByRole('button', { name: 'Reload saved tasks' }).click()
    await scan()
  })
}

test('reduced motion disables transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(
    await page
      .getByRole('button', { name: 'New task', exact: true })
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe('0s')
})
