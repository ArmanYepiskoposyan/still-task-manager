import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { at, installStorageFault, populate, restoreStorage, view } from './helpers'

test('capture actual browser evidence for Phase 2 review', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'One consistent browser produces review evidence.',
  )
  const outputDirectory = testInfo.outputPath('phase2-regression')
  await mkdir(outputDirectory, { recursive: true })
  await page.clock.setFixedTime(new Date(at))
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  const capture = async (name: string, fullPage = true) => {
    if (fullPage) await page.evaluate(() => window.scrollTo(0, 0))
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
    await page.screenshot({
      path: `${outputDirectory}/${name}.png`,
      fullPage,
      animations: 'disabled',
    })
  }
  await capture('05-empty-workspace')
  await page.getByRole('button', { name: 'New task', exact: true }).click()
  await page.getByLabel('Task title', { exact: false }).fill('Make space for a new idea')
  await page.getByLabel('Notes', { exact: false }).fill('A short outline is a good place to start.')
  await capture('06-create-task', false)
  await page.keyboard.press('Escape')
  // Every dashboard task is created through the real editor and persisted by the app.
  await populate(page)
  await view(page, 'All tasks')
  await capture('01-desktop-light')
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
  await capture('02-desktop-dark')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Light theme', exact: true }).click()
  await capture('03-mobile-light')
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
  await capture('04-mobile-dark')
  await page.getByRole('button', { name: 'Edit task: Polish the portfolio case study' }).click()
  await capture('11-mobile-editor-dark', false)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Delete task: Polish the portfolio case study' }).click()
  await capture('12-mobile-delete-dark', false)
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 1440, height: 1050 })
  await page.getByRole('button', { name: 'Light theme', exact: true }).click()
  await page.getByRole('button', { name: 'Edit task: Polish the portfolio case study' }).click()
  await capture('07-edit-task', false)
  await page.keyboard.press('Escape')
  await view(page, 'Completed')
  await capture('08-completed-task')
  await page.getByRole('button', { name: 'Delete task: Organize the design references' }).click()
  await capture('09-delete-confirmation', false)
  await installStorageFault(page, 'setItem')
  await page.getByRole('button', { name: 'Delete task', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('has not been deleted')
  await capture('15-failed-delete', false)
  await page.keyboard.press('Escape')
  await restoreStorage(page)
  await installStorageFault(page, 'getItem', 'SecurityError')
  await page.getByRole('button', { name: 'Reload saved tasks' }).click()
  await expect(page.getByRole('heading', { name: 'Your tasks couldn’t be loaded.' })).toBeVisible()
  await capture('10-storage-error')
  await page.setViewportSize({ width: 360, height: 800 })
  await capture('16-mobile-storage-error')
  await restoreStorage(page)
  await page.getByRole('button', { name: 'Retry loading tasks' }).click()
  await view(page, 'All tasks')
  await page.setViewportSize({ width: 768, height: 1024 })
  await capture('13-tablet-light')
  await page.setViewportSize({ width: 360, height: 800 })
  await capture('14-small-mobile-light')
  await page.getByRole('button', { name: 'New task', exact: true }).click()
  await page.getByLabel('Task title', { exact: false }).fill('Keep this thoughtful draft')
  await installStorageFault(page, 'setItem')
  await page.getByRole('button', { name: 'Create task', exact: true }).click()
  await capture('17-mobile-failed-create', false)
  await page.getByRole('button', { name: 'Create task', exact: true }).scrollIntoViewIfNeeded()
  await capture('18-mobile-failed-create-actions', false)
  await expect(page.getByRole('button', { name: 'Create task', exact: true })).toBeInViewport()
  await restoreStorage(page)
  await page.getByRole('button', { name: 'Create task', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
