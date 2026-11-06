import { chromium, expect } from '@playwright/test'
import { writeFile, mkdir } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import os from 'node:os'
import { syntheticTasks } from '../fixtures/tasks.ts'

// Production preview on 4173. Optional approved Phase 4 preview on 4183 for paired render checks.
const phase = process.argv.includes('--phase6') ? 'phase6' : 'phase5'
const compareBaseline = process.argv.includes('--compare-baseline')
const browser = await chromium.launch({ channel: 'chromium' })
const settle = (page) =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )
const median = (values) => {
  const s = [...values].sort((a, b) => a - b)
  return (s[Math.floor((s.length - 1) / 2)] + s[Math.ceil((s.length - 1) / 2)]) / 2
}
const at = '2026-11-02T12:00:00.000Z'
const results = []
const comparisons = []
try {
  if (compareBaseline)
    for (const count of [100, 1000, 3000]) {
      const trials = []
      for (let trial = 0; trial < 4; trial++) {
        const times = {}
        for (const version of trial % 2 ? ['phase5', 'phase4'] : ['phase4', 'phase5']) {
          const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } })
          const page = await context.newPage()
          const url = `http://127.0.0.1:${version === 'phase4' ? 4183 : 4173}`
          await page.goto(url)
          await page.evaluate(
            (tasks) => localStorage.setItem('still.tasks', JSON.stringify({ version: 1, tasks })),
            syntheticTasks(count),
          )
          const start = performance.now()
          await page.reload()
          await expect(page.locator('[data-task-id]')).toHaveCount(count)
          await page.evaluate(() => document.fonts.ready)
          await settle(page)
          times[version] = performance.now() - start
          await context.close()
        }
        trials.push(times)
      }
      comparisons.push({
        count,
        trials,
        medianMs: {
          phase4: median(trials.map((t) => t.phase4)),
          phase5: median(trials.map((t) => t.phase5)),
        },
      })
      console.log('paired render', comparisons.at(-1).count, comparisons.at(-1).medianMs)
    }
  for (const [count, projectCount] of [
    [100, 3],
    [1000, 20],
    [3000, 50],
  ]) {
    const projects = Array.from({ length: projectCount }, (_, i) => ({
      id: `project-${i}`,
      name: `Synthetic project ${i + 1}`,
      createdAt: at,
      updatedAt: at,
    }))
    const tasks = syntheticTasks(count).map((task, i) => ({
      ...task,
      dueDate: `2026-11-${String(3 + (i % 28)).padStart(2, '0')}`,
      projectId: i % 5 ? projects[i % projectCount].id : undefined,
    }))
    const data = { version: 2, tasks, projects }
    const backup = JSON.stringify({ format: 'still-backup', version: 1, exportedAt: at, data })
    const trials = []
    for (let trial = 0; trial < 4; trial++) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (e) => errors.push(e.message))
      await page.clock.setFixedTime(new Date(at))
      await page.goto('http://127.0.0.1:4173')
      await page.evaluate((data) => localStorage.setItem('still.tasks', JSON.stringify(data)), data)
      const timed = async (action) => {
        const start = performance.now()
        await action()
        await settle(page)
        return performance.now() - start
      }
      const render = await timed(async () => {
        await page.reload()
        await expect(page.locator('[data-task-id]')).toHaveCount(count)
        await page.evaluate(() => document.fonts.ready)
      })
      const search = await timed(async () => {
        await page.getByRole('searchbox').fill('Portfolio')
        await expect(page.locator('[data-task-id]')).toHaveCount(Math.ceil(count / 10))
      })
      await page.getByRole('searchbox').fill('')
      const sort = await timed(() => page.getByLabel('Sort by').selectOption('title'))
      const project = await timed(async () => {
        await page.getByLabel('PROJECTS', { exact: true }).selectOption('project-1')
        await expect(page.locator('[data-task-id]')).toHaveCount(
          tasks.filter((task) => task.projectId === 'project-1').length,
        )
      })
      const upcoming = await timed(async () => {
        await page
          .getByRole('navigation')
          .getByRole('button', { name: /^Upcoming,/ })
          .click()
        await expect(page.locator('[data-task-id]')).toHaveCount(count)
        await expect(page.locator('.task-group')).toHaveCount(28)
      })
      await page.getByRole('button', { name: 'Backup & restore' }).click()
      const exportDownload = await timed(async () => {
        const download = page.waitForEvent('download')
        await page.getByRole('button', { name: 'Download backup', exact: true }).click()
        expect((await download).suggestedFilename()).toBe('still-backup-2026-11-02.json')
      })
      const importPreview = await timed(async () => {
        await page.getByLabel('Choose JSON file').setInputFiles({
          name: 'synthetic.json',
          mimeType: 'application/json',
          buffer: Buffer.from(backup),
        })
        await expect(
          page.getByRole('heading', { name: 'Import preview', exact: true }),
        ).toBeVisible()
      })
      await page.getByRole('checkbox', { name: /I understand/ }).check()
      const restore = await timed(async () => {
        await page.getByRole('button', { name: 'Replace workspace' }).click()
        await expect(page.getByRole('dialog')).toHaveCount(0)
        await expect(page.locator('[data-task-id]')).toHaveCount(count)
      })
      expect(
        await page.evaluate(() => JSON.parse(localStorage.getItem('still.tasks')).tasks.length),
      ).toBe(count)
      expect(errors).toEqual([])
      const cdp = await context.newCDPSession(page)
      await cdp.send('HeapProfiler.collectGarbage')
      const heap = await cdp.send('Runtime.getHeapUsage')
      trials.push({
        render,
        search,
        sort,
        project,
        upcoming,
        exportDownload,
        importPreview,
        restore,
        heapBytesAfterRestore: heap.usedSize,
      })
      await context.close()
    }
    const medianMs = Object.fromEntries(
      [
        'render',
        'search',
        'sort',
        'project',
        'upcoming',
        'exportDownload',
        'importPreview',
        'restore',
      ].map((key) => [key, Number(median(trials.map((t) => t[key])).toFixed(2))]),
    )
    results.push({ count, projectCount, jsonBytes: Buffer.byteLength(backup), trials, medianMs })
    console.log(`${phase} collection`, count, projectCount, medianMs)
  }
  await mkdir('docs/measurements', { recursive: true })
  await writeFile(
    `docs/measurements/${phase}-performance.json`,
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        node: process.version,
        browser: browser.version(),
        platform: os.platform(),
        arch: os.arch(),
        cpu: os.cpus()[0]?.model,
        logicalCpus: os.cpus().length,
        memoryBytes: os.totalmem(),
        trialsPerSize: 4,
        method:
          'Local production builds. Playwright elapsed time plus observable DOM and two animation frames; not INP. Uncontrolled machine load. Paired renders alternate order using identical v1 records. Phase 5 feature timings use v2 records with projects.',
        comparisons,
        results,
      },
      null,
      2,
    ) + '\n',
  )
} finally {
  await browser.close()
}
