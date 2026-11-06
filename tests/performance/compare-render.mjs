import { chromium, expect } from '@playwright/test'
import { performance } from 'node:perf_hooks'
import { writeFile } from 'node:fs/promises'
import { syntheticTasks } from '../fixtures/tasks.ts'

// Serve the archived Phase 3 build on 4183 and Phase 4 on 4173 before running.
// Alternating the order reduces drift; both builds share the same installed dependencies.
const urls = { approved: 'http://127.0.0.1:4183', current: 'http://127.0.0.1:4173' }
const browser = await chromium.launch({ channel: 'chromium' })
const results = []
try {
  for (const count of [100, 1000, 3000]) {
    const samples = { approved: [], current: [] }
    for (let trial = 0; trial < 4; trial++) {
      const order = trial % 2 ? ['current', 'approved'] : ['approved', 'current']
      for (const label of order) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } })
        const page = await context.newPage()
        const errors = []
        page.on('pageerror', (error) => errors.push(error.message))
        await page.goto(urls[label])
        await page.evaluate(
          (tasks) => localStorage.setItem('still.tasks', JSON.stringify({ version: 1, tasks })),
          syntheticTasks(count),
        )
        const start = performance.now()
        await page.reload()
        await expect(page.locator('[data-task-id]')).toHaveCount(count)
        await page.evaluate(() => document.fonts.ready)
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        )
        samples[label].push(performance.now() - start)
        expect(errors).toEqual([])
        await context.close()
      }
    }
    const median = (values) => {
      const sorted = [...values].sort((a, b) => a - b)
      return Number(((sorted[1] + sorted[2]) / 2).toFixed(2))
    }
    results.push({
      count,
      samples,
      medianMs: { approved: median(samples.approved), current: median(samples.current) },
    })
    console.log(results.at(-1))
  }
  await writeFile(
    'docs/measurements/phase4-render-comparison.json',
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        browser: browser.version(),
        trialsPerSizePerBuild: 4,
        order: 'alternating approved/current, then current/approved',
        results,
      },
      null,
      2,
    ) + '\n',
  )
} finally {
  await browser.close()
}
