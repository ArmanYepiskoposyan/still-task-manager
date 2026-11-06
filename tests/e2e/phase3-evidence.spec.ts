import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { at, view } from './helpers'
import { filters, populateDaily, showToday } from './organization-helpers'

test('capture actual Phase 3 interface evidence', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'One consistent browser captures review evidence; all behavior tests run in every engine.',
  )
  const output = testInfo.outputPath('phase3-regression')
  await mkdir(output, { recursive: true })
  await page.clock.setFixedTime(new Date(at))
  await page.goto('/')
  await populateDaily(page)
  await showToday(page)
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
      path: `${output}/${name}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  }
  await page.getByRole('button', { name: 'Light theme', exact: true }).click()
  await capture('01-today-desktop-light')
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
  await capture('02-today-desktop-dark')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Light theme', exact: true }).click()
  await capture('03-today-mobile-light')
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
  await capture('04-today-mobile-dark')
  await page.setViewportSize({ width: 1440, height: 1050 })
  await page.getByRole('button', { name: 'Light theme', exact: true }).click()
  await filters(page)
  await page.getByLabel('Deadline filter').selectOption('Overdue')
  await capture('05-overdue-tasks')
  await page.getByRole('button', { name: 'Reset filters' }).click()
  await page.getByRole('button', { name: /^Filters/ }).click()
  await view(page, 'All tasks')
  await page.getByRole('searchbox').fill('portfolio')
  await capture('06-search-results')
  await page.getByRole('button', { name: 'Clear search', exact: true }).click()
  await filters(page)
  await page.getByLabel('Status', { exact: true }).selectOption('Incomplete')
  await page.getByLabel('Priority filter').selectOption('High')
  await capture('07-active-filters')
  await page.getByRole('button', { name: 'Reset filters' }).click()
  await page.getByRole('button', { name: /^Filters/ }).click()
  await page.getByLabel('Sort by').selectOption('title')
  await page.getByLabel('Sort by').focus()
  await capture('08-sorting-interface')
  await page.getByRole('searchbox').fill('weekend retreat')
  await expect(page.getByRole('heading', { name: 'No matching tasks.' })).toBeVisible()
  await capture('09-no-results')
  await page.getByRole('button', { name: 'Clear search', exact: true }).click()
  await view(page, 'Completed')
  await capture('10-completed-tasks')
  await showToday(page)
  await page.getByLabel('Sort by').selectOption('due')
  await page.setViewportSize({ width: 320, height: 800 })
  await capture('11-narrow-320px')
  await page.setViewportSize({ width: 1440, height: 1050 })
  await view(page, 'All tasks')
  await filters(page)
  await page.getByLabel('Status', { exact: true }).selectOption('Incomplete')
  await page.getByLabel('Priority filter').selectOption('High')
  await page.getByLabel('Deadline filter').selectOption('Today')
  await page.getByRole('searchbox').fill('portfolio')
  await capture('12-combined-search-filters')
  await page.setViewportSize({ width: 320, height: 800 })
  await capture('13-mobile-active-filters')
  await page.getByRole('button', { name: 'Reset filters' }).click()
  await page.getByRole('button', { name: 'Clear search', exact: true }).click()
  await page.getByRole('button', { name: /^Filters/ }).click()
  await showToday(page)
  // Complete each real Today task; the empty view is a consequence of successful writes.
  while (await page.getByRole('checkbox', { name: /^Complete task:/ }).count())
    await page
      .getByRole('checkbox', { name: /^Complete task:/ })
      .first()
      .click()
  await page.setViewportSize({ width: 1440, height: 1050 })
  await capture('14-today-empty')
})
