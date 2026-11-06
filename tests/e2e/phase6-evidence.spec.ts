import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { seedPhase5, chooseBackup } from './phase5-helpers'
import { view, installStorageFault, restoreStorage } from './helpers'

test('capture final Phase 6 release screenshots', async ({ page }, info) => {
  test.setTimeout(120_000)
  test.skip(
    info.project.name !== 'chromium',
    'One engine writes final screenshots; functionality is tested in all three.',
  )
  await mkdir('docs/screenshots/phase6', { recursive: true })
  await seedPhase5(page)
  const capture = async (name: string) => {
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
    await page.screenshot({
      path: `docs/screenshots/phase6/${name}.png`,
      fullPage: !(await page.locator('dialog[open]').count()),
      animations: 'disabled',
    })
  }
  await capture('01-desktop-light')
  await page.getByRole('button', { name: 'Dark theme' }).click()
  await capture('02-desktop-dark')
  await view(page, 'Upcoming')
  await capture('03-upcoming-dark')
  await page.getByRole('button', { name: 'Light theme' }).click()
  await capture('04-upcoming-light')
  await page.getByLabel('PROJECTS', { exact: true }).selectOption('portfolio')
  await capture('05-project-view')
  await page.getByRole('button', { name: 'Edit task: Write the story behind the work' }).click()
  await capture('06-task-editor')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Delete selected project' }).click()
  await capture('07-project-delete-confirmation')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Backup & restore' }).click()
  await capture('08-backup-export')
  await chooseBackup(page)
  await expect(page.getByRole('heading', { name: 'Import preview', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Replace workspace' }).scrollIntoViewIfNeeded()
  await capture('09-import-preview')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Keyboard shortcuts' }).click()
  await capture('10-shortcut-help')
  await page.keyboard.press('Escape')
  let index = 11
  for (const width of [768, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await view(page, 'Upcoming')
    for (const theme of ['Light', 'Dark']) {
      await page.getByRole('button', { name: `${theme} theme` }).click()
      await page.evaluate(() => scrollTo(0, 0))
      await capture(`${String(index++).padStart(2, '0')}-${width}-${theme.toLowerCase()}`)
    }
  }
  await page.getByRole('button', { name: 'New task', exact: true }).click()
  await page.getByLabel('Task title').fill('Keep this synthetic draft')
  await installStorageFault(page, 'setItem')
  await page.getByRole('button', { name: 'Create task', exact: true }).click()
  await page.getByRole('dialog').getByRole('alert').scrollIntoViewIfNeeded()
  await capture('19-320-failed-save-dark')
  await page.keyboard.press('Escape')
  await restoreStorage(page)
  await page.evaluate(() => localStorage.setItem('still.tasks', '{synthetic recovery example'))
  await page.reload()
  await page.getByRole('button', { name: 'Backup & restore' }).click()
  await capture('20-320-storage-recovery-dark')
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 1440, height: 1050 })
  await seedPhase5(page)
  await page.getByRole('button', { name: 'Light theme' }).click()
  await view(page, 'Today')
  await capture('21-today-light')
  await view(page, 'All tasks')
  await page.getByRole('searchbox').fill('work')
  await page.getByRole('button', { name: 'Filters', exact: true }).click()
  await page.getByLabel('Priority filter', { exact: true }).selectOption('High')
  await capture('22-search-and-filters-light')
  await page.getByRole('searchbox').fill('no synthetic match')
  await capture('23-no-results-light')
  await page.evaluate(() => localStorage.removeItem('still.tasks'))
  await page.reload()
  await capture('24-empty-workspace-light')
})
