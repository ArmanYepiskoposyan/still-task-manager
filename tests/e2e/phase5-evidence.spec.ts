import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { chooseBackup, seedPhase5 } from './phase5-helpers'
import { view } from './helpers'
test('capture actual Phase 5 interface and recovery evidence', async ({ page }, info) => {
  test.setTimeout(120_000)
  test.skip(
    info.project.name !== 'chromium',
    'Chromium captures evidence; all functional tests run in all three engines.',
  )
  const outputDir = info.outputPath('phase5-regression')
  await mkdir(outputDir, { recursive: true })
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
      path: `${outputDir}/${name}.png`,
      fullPage: !(await page.locator('dialog[open]').count()),
      animations: 'disabled',
    })
  }
  await capture('01-desktop-light-statistics')
  await page.getByRole('button', { name: 'Dark theme' }).click()
  await capture('02-desktop-dark-statistics')
  await view(page, 'Upcoming')
  await capture('03-upcoming-dark')
  await page.getByRole('button', { name: 'Light theme' }).click()
  await capture('04-upcoming-light')
  await page.getByLabel('PROJECTS', { exact: true }).selectOption('portfolio')
  await capture('05-project-navigation')
  await page.getByRole('button', { name: 'New project' }).click()
  await page.getByLabel('Project name').fill('A thoughtful reading list')
  await capture('06-project-creation')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Edit selected project' }).click()
  await capture('07-project-editing')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Delete selected project' }).click()
  await capture('08-project-deletion')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Edit task: Write the story behind the work' }).click()
  await capture('09-task-assignment')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Backup & restore' }).click()
  await capture('10-backup-export')
  await chooseBackup(page)
  await expect(page.getByRole('heading', { name: 'Import preview', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Replace workspace' }).scrollIntoViewIfNeeded()
  await capture('11-import-preview')
  await chooseBackup(page, '{"invalid": "synthetic file"}')
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
  await capture('12-import-validation-error')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Keyboard shortcuts' }).click()
  await capture('13-shortcut-help')
  await page.keyboard.press('Escape')
  let index = 14
  for (const width of [768, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await view(page, 'Upcoming')
    for (const theme of ['Light', 'Dark']) {
      await page.getByRole('button', { name: `${theme} theme` }).click()
      await page.evaluate(() => scrollTo(0, 0))
      await capture(`${String(index++).padStart(2, '0')}-${width}-${theme.toLowerCase()}`)
    }
  }
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('button', { name: `${theme} theme` }).click()
    await page.getByRole('button', { name: 'Backup & restore' }).click()
    await chooseBackup(page)
    await expect(page.getByRole('heading', { name: 'Import preview', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Replace workspace' }).scrollIntoViewIfNeeded()
    await capture(`${String(index++).padStart(2, '0')}-320-import-${theme.toLowerCase()}`)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'New project' }).click()
    await capture(`${String(index++).padStart(2, '0')}-320-project-${theme.toLowerCase()}`)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Keyboard shortcuts' }).click()
    await capture(`${String(index++).padStart(2, '0')}-320-shortcuts-${theme.toLowerCase()}`)
    await page.keyboard.press('Escape')
  }
  await page.setViewportSize({ width: 1440, height: 1050 })
  await page.evaluate(() => localStorage.setItem('still.tasks', '{synthetic corrupted document 🌿'))
  await page.reload()
  await page.getByRole('button', { name: 'Light theme' }).click()
  await capture('28-storage-recovery-workspace')
  await page.getByRole('button', { name: 'Backup & restore' }).click()
  await capture('29-storage-recovery-download')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Dark theme' }).click()
  await page.getByRole('button', { name: 'Backup & restore' }).click()
  await capture('30-storage-recovery-dark')
})
