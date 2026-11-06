import approvedVersion1 from '../fixtures/phase5-version1.json' with { type: 'json' }
import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
import { addTask, installStorageFault, restoreStorage, saved, view } from './helpers'
import { filters } from './organization-helpers'
import {
  chooseBackup,
  confirmBackup,
  newProject,
  phase5At,
  phase5Data,
  previewBackup,
  rawSaved,
  seedPhase5,
} from './phase5-helpers'
const errors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const list: string[] = []
  errors.set(page, list)
  page.on('pageerror', (error) => list.push(error.message))
  await page.clock.setFixedTime(new Date(phase5At))
  await page.goto('/')
})
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]))
const scan = async (page: Page) =>
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([])

test('v1 upgrade preserves records; projects create, rename, assign, reassign and delete persist', async ({
  page,
}) => {
  const oldTasks = approvedVersion1.tasks
  const legacy = JSON.stringify({ version: 1, tasks: oldTasks })
  await page.evaluate((raw) => localStorage.setItem('still.tasks', raw), legacy)
  await page.reload()
  expect(await rawSaved(page)).toBe(legacy)
  await newProject(page, 'Ideas')
  let document = JSON.parse((await rawSaved(page))!)
  expect(document.version).toBe(2)
  expect(document.tasks).toEqual(oldTasks)
  const id = document.projects[0].id
  await page.getByLabel('PROJECTS', { exact: true }).selectOption(id)
  await page.getByRole('button', { name: 'Edit selected project' }).click()
  await page.getByLabel('Project name').fill('Thoughtful plans')
  await page.getByRole('button', { name: 'Save project', exact: true }).click()
  await addTask(page, 'A new perspective')
  const created = (await saved(page)).find((task) => task.title === 'A new perspective')!
  expect(created.projectId).toBe(id)
  await newProject(page, 'Reading')
  document = JSON.parse((await rawSaved(page))!)
  const other = document.projects[1].id
  await page.getByRole('button', { name: 'Edit task: A new perspective', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Project', { exact: false }).selectOption(other)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.getByLabel('PROJECTS', { exact: true }).selectOption(other)
  await expect(page.locator('[data-task-id]')).toHaveCount(1)
  await expect(page.getByLabel('PROJECTS', { exact: true })).toContainText('Reading (1)')
  await page.reload()
  await page.getByLabel('PROJECTS', { exact: true }).selectOption(other)
  await page.getByRole('button', { name: 'Delete selected project' }).click()
  await expect(page.getByRole('dialog')).toContainText('No tasks will be deleted')
  await expect(page.getByRole('button', { name: 'Keep project' })).toBeFocused()
  await page.getByRole('button', { name: 'Keep project' }).click()
  expect((await saved(page)).find((task) => task.id === created.id)?.projectId).toBe(other)
  await page.getByRole('button', { name: 'Delete selected project' }).click()
  await page.getByRole('button', { name: 'Delete project', exact: true }).click()
  expect((await saved(page)).find((task) => task.id === created.id)?.projectId).toBeUndefined()
  expect((await saved(page)).slice(0, oldTasks.length)).toEqual(oldTasks)
  await page.reload()
  expect(JSON.parse((await rawSaved(page))!).projects).toHaveLength(1)
  expect(JSON.parse((await rawSaved(page))!).projects[0]).toMatchObject({
    id,
    name: 'Thoughtful plans',
  })
})
test('duplicate project names and failed project saves preserve both collections', async ({
  page,
}) => {
  await seedPhase5(page)
  const before = await rawSaved(page)
  await newProject(page, ' portfolio REFRESH ')
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('already exists')
  expect(await rawSaved(page)).toBe(before)
  await page.getByLabel('Project name').fill('A new chapter')
  await installStorageFault(page, 'setItem')
  await page.getByRole('button', { name: 'Create project', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('wasn’t saved')
  await expect(page.getByLabel('Project name')).toHaveValue('A new chapter')
  expect(await rawSaved(page)).toBe(before)
  await restoreStorage(page)
  await page.getByRole('button', { name: 'Create project', exact: true }).click()
  expect(JSON.parse((await rawSaved(page))!).projects).toHaveLength(3)
})
test('Upcoming remains chronological, filterable, editable and excludes completed work', async ({
  page,
}) => {
  await seedPhase5(page)
  await view(page, 'Upcoming')
  await expect(page.locator('.task-group')).toHaveCount(2)
  await expect(page.locator('.task-group').first()).toHaveAttribute('aria-label', 'Due Nov 3, 2026')
  await expect(page.locator('[data-task-id]')).toHaveCount(3)
  await page.getByLabel('Sort by', { exact: true }).selectOption('priority')
  await expect(
    page.locator('.task-group').first().locator('[data-task-id]').first(),
  ).toHaveAttribute('data-task-id', 'story')
  await filters(page)
  await page.getByLabel('Priority filter').selectOption('High')
  await expect(page.locator('[data-task-id]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Reset filters' }).click()
  await page.getByRole('searchbox').fill('quiet')
  await expect(page.getByRole('heading', { name: 'No matching tasks.' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear search and filters' }).click()
  await page
    .getByRole('checkbox', { name: 'Complete task: Write the story behind the work' })
    .click()
  await expect(page.locator('[data-task-id]')).toHaveCount(2)
  await expect(page.getByRole('region', { name: 'Workload summary' })).toContainText(
    '2 completed today',
  )
  await page.getByRole('button', { name: 'Edit task: Bring a little green indoors' }).click()
  await page.getByLabel('Due date').fill('2026-11-02')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.locator('[data-task-id]')).toHaveCount(1)
  await page.reload()
  await view(page, 'Upcoming')
  await expect(page.locator('[data-task-id]')).toHaveAttribute('data-task-id', 'review')
})
for (const timezoneId of ['Pacific/Kiritimati', 'America/Los_Angeles'])
  test(`Upcoming and completed-today change at local midnight: ${timezoneId}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ timezoneId })
    const page = await context.newPage()
    // Absolute instants bracketing local Nov 2/3 midnight, including LA standard time after DST.
    const midnight =
      timezoneId === 'Pacific/Kiritimati' ? '2026-11-02T10:00:00.000Z' : '2026-11-03T08:00:00.000Z'
    const before = new Date(new Date(midnight).getTime() - 10_000)
    await page.clock.install({ time: new Date(before.getTime() - 60_000) })
    await page.clock.pauseAt(before)
    await page.goto('http://127.0.0.1:4173')
    await page.evaluate(
      ({ data, completedAt }) =>
        localStorage.setItem(
          'still.tasks',
          JSON.stringify({
            version: 2,
            ...data,
            tasks: data.tasks.map((task) => ({
              ...task,
              createdAt: completedAt,
              updatedAt: completedAt,
              ...(task.completed ? { completedAt } : {}),
            })),
          }),
        ),
      { data: phase5Data, completedAt: before.toISOString() },
    )
    await page.reload()
    await view(page, 'Upcoming')
    await expect(page.locator('[data-task-id]')).toHaveCount(3)
    await expect(page.getByRole('region', { name: 'Workload summary' })).toContainText(
      '1 completed today',
    )
    await page.clock.runFor(10_100)
    await expect(page.locator('[data-task-id]')).toHaveCount(1)
    await expect(page.getByRole('region', { name: 'Workload summary' })).toContainText(
      '0 completed today',
    )
    await context.close()
  })
test('actual UTF-8 backup download round trips every field without theme or unrelated storage', async ({
  page,
}, info) => {
  await seedPhase5(page)
  await page.evaluate(() => {
    localStorage.setItem('unrelated', 'not for export')
    localStorage.setItem('still.theme', 'dark')
  })
  await page.getByRole('button', { name: 'Backup & restore' }).click()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download backup', exact: true }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('still-backup-2026-11-02.json')
  const path = info.outputPath('backup.json')
  await download.saveAs(path)
  const text = await readFile(path, 'utf8')
  expect(JSON.parse(text)).toEqual({
    format: 'still-backup',
    version: 1,
    exportedAt: phase5At,
    data: { version: 2, ...phase5Data },
  })
  expect(text).not.toContain('unrelated')
  expect(text).not.toContain('theme')
  await page.keyboard.press('Escape')
  await addTask(page, 'Will be replaced')
  await previewBackup(page, text)
  await expect(page.getByRole('button', { name: 'Replace workspace' })).toBeDisabled()
  expect(await saved(page)).toHaveLength(7)
  await confirmBackup(page)
  expect(await saved(page)).toEqual(phase5Data.tasks)
  await page.reload()
  expect(JSON.parse((await rawSaved(page))!)).toEqual({ version: 2, ...phase5Data })
})
test('rejects malformed, oversized, duplicate, dangling, future and invalid-date imports without writes', async ({
  page,
}) => {
  await seedPhase5(page)
  const before = await rawSaved(page)
  await page.getByRole('button', { name: 'Backup & restore' }).click()
  const invalid = [
    'broken',
    JSON.stringify({ version: 999, ...phase5Data }),
    JSON.stringify({
      version: 2,
      ...phase5Data,
      tasks: [phase5Data.tasks[0], phase5Data.tasks[0]],
    }),
    JSON.stringify({ version: 2, tasks: phase5Data.tasks, projects: [] }),
    JSON.stringify({
      version: 2,
      ...phase5Data,
      tasks: [{ ...phase5Data.tasks[0], dueDate: '2026-02-29' }],
    }),
    JSON.stringify({
      version: 2,
      ...phase5Data,
      projects: [phase5Data.projects[0], phase5Data.projects[0]],
    }),
    ' '.repeat(10 * 1024 * 1024 + 1),
  ]
  for (const text of invalid) {
    await chooseBackup(page, text)
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Nothing was imported')
    await expect(page.getByRole('heading', { name: 'Import preview', exact: true })).toHaveCount(0)
    expect(await rawSaved(page)).toBe(before)
  }
})
for (const fault of ['QuotaExceededError', 'SecurityError'])
  test(`failed restore retains committed data and retries only with confirmation: ${fault}`, async ({
    page,
  }) => {
    await addTask(page, 'Keep the original')
    const before = await rawSaved(page)
    await previewBackup(page)
    await installStorageFault(page, 'setItem', fault)
    await confirmBackup(page)
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('wasn’t saved')
    expect(await rawSaved(page)).toBe(before)
    await expect(page.getByRole('button', { name: 'Replace workspace' })).toBeDisabled()
    await restoreStorage(page)
    await confirmBackup(page)
    expect(await saved(page)).toEqual(phase5Data.tasks)
  })
test('an external tab change after preview cannot be overwritten by restore', async ({
  page,
  context,
}) => {
  await seedPhase5(page)
  await previewBackup(page)
  const other = await context.newPage()
  await other.goto('/')
  await addTask(other, 'External task')
  const external = await rawSaved(other)
  await confirmBackup(page)
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('another tab')
  expect(await rawSaved(page)).toBe(external)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Reload saved tasks' }).click()
  await expect(page.getByRole('button', { name: 'Edit task: External task' })).toBeVisible()
  await other.close()
})
for (const raw of ['{broken 🌿', '{"version":999,"tasks":[],"projects":[]}'])
  test(`recovery downloads untouched raw bytes and requires confirmed replacement: ${raw}`, async ({
    page,
  }, info) => {
    await page.evaluate((raw) => localStorage.setItem('still.tasks', raw), raw)
    await page.reload()
    await page.getByRole('button', { name: 'Backup & restore' }).click()
    await expect(page.getByRole('button', { name: 'Download backup', exact: true })).toBeDisabled()
    const downloading = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download raw stored document' }).click()
    const download = await downloading
    const path = info.outputPath('raw.txt')
    await download.saveAs(path)
    expect(await readFile(path, 'utf8')).toBe(raw)
    expect(await rawSaved(page)).toBe(raw)
    await chooseBackup(page)
    await confirmBackup(page)
    expect(await saved(page)).toEqual(phase5Data.tasks)
    await page.reload()
    await expect(page.getByRole('button', { name: 'New task', exact: true })).toBeEnabled()
  })
test('blocked storage disables restore until storage is readable again', async ({ page }) => {
  await installStorageFault(page, 'getItem', 'SecurityError')
  await page.getByRole('button', { name: 'Backup & restore' }).click()
  await expect(page.getByLabel('Choose JSON file')).toBeDisabled()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('unavailable')
  await page.keyboard.press('Escape')
  await restoreStorage(page)
  await previewBackup(page)
  await confirmBackup(page)
  expect(await saved(page)).toHaveLength(6)
})
test('keyboard shortcuts avoid text entry and dialogs, restore focus and can be switched off', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'New task', exact: true }).focus()
  await page.keyboard.press('/')
  await expect(page.getByRole('searchbox')).toBeFocused()
  await page.keyboard.type('n?')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'New task', exact: true }).focus()
  await page.keyboard.press('n')
  await expect(page.getByLabel('Task title')).toBeFocused()
  await page.keyboard.type('n / ?')
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'New task', exact: true })).toBeFocused()
  await page.keyboard.press('?')
  await expect(page.getByRole('button', { name: 'Close shortcuts' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('checkbox', { name: /Enable single-key/ })).toBeFocused()
  await page.keyboard.press('Space')
  await page.keyboard.press('Escape')
  await page.keyboard.press('n')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Keyboard shortcuts', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: /Enable single-key/ })).not.toBeChecked()
})
for (const width of [320, 360, 390, 768, 1440])
  test(`Phase 5 responsive and accessible at ${width}px in both themes`, async ({ page }) => {
    test.setTimeout(120_000)
    await seedPhase5(page)
    await page.setViewportSize({ width, height: 900 })
    for (const theme of ['Light', 'Dark']) {
      await page.getByRole('button', { name: `${theme} theme`, exact: true }).click()
      await view(page, 'Upcoming')
      await scan(page)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      await page.getByLabel('PROJECTS', { exact: true }).selectOption('portfolio')
      await expect(page.locator('[data-task-id]')).toHaveCount(3)
      await previewBackup(page)
      await expect(page.getByRole('heading', { name: 'Import preview', exact: true })).toBeFocused()
      await scan(page)
      expect(
        await page.getByRole('dialog').evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
      ).toBe(true)
      await page.getByRole('checkbox', { name: /I understand/ }).check()
      await page.getByRole('button', { name: 'Replace workspace' }).scrollIntoViewIfNeeded()
      await expect(page.getByRole('button', { name: 'Replace workspace' })).toBeInViewport()
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Keyboard shortcuts' }).click()
      await scan(page)
      await page.keyboard.press('Escape')
    }
  })
test('project dialogs, assignment, import error and recovery pass accessibility scans in both themes', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await seedPhase5(page)
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('button', { name: `${theme} theme`, exact: true }).click()
    await page.getByRole('button', { name: 'New project' }).click()
    await scan(page)
    await page.keyboard.press('Escape')
    await page.getByLabel('PROJECTS', { exact: true }).selectOption('portfolio')
    await page.getByRole('button', { name: 'Edit selected project' }).click()
    await scan(page)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Delete selected project' }).click()
    await scan(page)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Edit task: Write the story behind the work' }).click()
    await scan(page)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Backup & restore' }).click()
    await chooseBackup(page, 'bad JSON')
    await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
    await scan(page)
    await page.keyboard.press('Escape')
  }
  await page.evaluate(() => localStorage.setItem('still.tasks', '{corrupt'))
  await page.reload()
  await page.getByRole('button', { name: 'Backup & restore' }).click()
  await scan(page)
})

test('long project names and literal imported text remain readable and safe on narrow screens', async ({
  page,
}) => {
  await seedPhase5(page)
  await page.setViewportSize({ width: 320, height: 900 })
  const name = 'W'.repeat(80)
  await newProject(page, name)
  const doc = JSON.parse((await rawSaved(page))!)
  await page.getByLabel('PROJECTS', { exact: true }).selectOption(doc.projects.at(-1).id)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${name}.`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Delete selected project' }).click()
  expect(
    await page.getByRole('dialog').evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true)
  await page.keyboard.press('Escape')
  const literal = '<img id="injected-backup" src=x onerror="window.injected=true"> 🌿'
  await previewBackup(
    page,
    JSON.stringify({
      version: 2,
      tasks: [{ ...phase5Data.tasks[0], title: literal }],
      projects: phase5Data.projects,
    }),
  )
  await confirmBackup(page)
  await expect(
    page.getByRole('button', { name: `Edit task: ${literal}`, exact: true }),
  ).toBeVisible()
  await expect(page.locator('#injected-backup')).toHaveCount(0)
  expect(await page.evaluate(() => Object.hasOwn(window, 'injected'))).toBe(false)
  await page.reload()
  expect((await saved(page))[0]?.title).toBe(literal)
})
