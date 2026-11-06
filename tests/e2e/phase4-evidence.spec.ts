import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { addTask, at, installStorageFault, restoreStorage } from './helpers'
import { filters, populateDaily } from './organization-helpers'
import { syntheticTasks } from '../fixtures/tasks'

test('capture actual Phase 4 quality evidence', async ({ page }, info) => {
  test.setTimeout(90_000)
  test.skip(
    info.project.name !== 'chromium',
    'One browser captures evidence; all behavior checks run in every engine.',
  )
  const outputDir = info.outputPath('phase4-regression')
  await mkdir(outputDir, { recursive: true })
  await page.clock.setFixedTime(new Date(at))
  await page.goto('/')
  const capture = async (name: string) => {
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
    await page.screenshot({
      path: `${outputDir}/${name}.png`,
      fullPage: (await page.locator('dialog[open]').count()) === 0,
      animations: 'disabled',
    })
  }
  await page.setViewportSize({ width: 320, height: 800 })
  for (const [i, theme] of ['Light', 'Dark'].entries()) {
    await page.getByRole('button', { name: `${theme} theme`, exact: true }).click()
    await capture(`${String(i + 3).padStart(2, '0')}-after-narrow-${theme.toLowerCase()}`)
  }
  await populateDaily(page)
  await filters(page)
  let index = 5
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of ['Light', 'Dark']) {
      await page.getByRole('button', { name: `${theme} theme`, exact: true }).click()
      await capture(`${String(index++).padStart(2, '0')}-${width}-${theme.toLowerCase()}`)
    }
  }
  const longTitle = 'A thoughtful next step — ' + 'W'.repeat(150)
  await addTask(page, longTitle, { notes: 'Long synthetic notes. '.repeat(200), priority: 'High' })
  await page.setViewportSize({ width: 320, height: 800 })
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('button', { name: `${theme} theme`, exact: true }).click()
    await page.getByRole('button', { name: `Edit task: ${longTitle}`, exact: true }).click()
    await capture(`${String(index++).padStart(2, '0')}-editor-${theme.toLowerCase()}`)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: `Delete task: ${longTitle}`, exact: true }).click()
    await capture(`${String(index++).padStart(2, '0')}-delete-${theme.toLowerCase()}`)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'New task', exact: true }).click()
    await page.getByRole('dialog').getByLabel('Task title').fill('Keep the synthetic draft')
    await installStorageFault(page, 'setItem')
    await page.getByRole('button', { name: 'Create task', exact: true }).click()
    await page.getByRole('dialog').getByRole('alert').scrollIntoViewIfNeeded()
    await capture(`${String(index++).padStart(2, '0')}-failed-save-${theme.toLowerCase()}`)
    await page.keyboard.press('Escape')
    await restoreStorage(page)
    await page.getByRole('button', { name: 'Reload saved tasks' }).click()
    await page.getByRole('searchbox').fill('no matching synthetic phrase')
    await expect(page.getByRole('heading', { name: 'No matching tasks.' })).toBeVisible()
    await capture(`${String(index++).padStart(2, '0')}-no-results-${theme.toLowerCase()}`)
    await page.getByRole('button', { name: 'Clear search and filters' }).click()
  }
  await page.evaluate(
    (tasks) => localStorage.setItem('still.tasks', JSON.stringify({ version: 1, tasks })),
    syntheticTasks(100),
  )
  await page.reload()
  await page.setViewportSize({ width: 1440, height: 1050 })
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('button', { name: `${theme} theme`, exact: true }).click()
    // Viewport capture for density; the other evidence is full-page. All 100 rows are real.
    await page.screenshot({
      path: `${outputDir}/${String(index++).padStart(2, '0')}-dense-${theme.toLowerCase()}.png`,
      animations: 'disabled',
    })
  }
})
