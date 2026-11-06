import { chromium, expect } from '@playwright/test'
import { writeFile, mkdir } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import os from 'node:os'
import { syntheticTasks } from '../fixtures/tasks.ts'

// Run against a production preview. Numbers include Playwright protocol overhead,
// observable DOM completion and two animation frames; not an INP or device benchmark.
const label = process.argv[2] ?? 'after'
if (!['before', 'after'].includes(label)) throw new Error('Use before or after')
const browser = await chromium.launch({ channel: 'chromium' })
const results = []
const settle = (page) =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
try {
  for (const count of [100, 1000, 3000]) {
    const trials = []
    for (let trial = 0; trial < 3; trial++) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (e) => errors.push(e.message))
      await page.goto('http://127.0.0.1:4173')
      await page.evaluate(
        (tasks) => localStorage.setItem('still.tasks', JSON.stringify({ version: 1, tasks })),
        syntheticTasks(count),
      )
      await page.addInitScript(() => {
        window.auditWrites = []
        const original = Storage.prototype.setItem
        Storage.prototype.setItem = function (key, value) {
          const start = performance.now()
          const result = original.call(this, key, value)
          if (key === 'still.tasks') window.auditWrites.push(performance.now() - start)
          return result
        }
      })
      const start = performance.now()
      await page.reload()
      await expect(page.locator('[data-task-id]')).toHaveCount(count)
      await page.evaluate(() => document.fonts.ready)
      await settle(page)
      const render = performance.now() - start
      const cdp = await context.newCDPSession(page)
      const memory = async () => {
        await cdp.send('HeapProfiler.collectGarbage')
        const heap = await cdp.send('Runtime.getHeapUsage')
        const dom = await cdp.send('Memory.getDOMCounters')
        return { heapBytes: heap.usedSize, nodes: dom.nodes, listeners: dom.jsEventListeners }
      }
      const initialMemory = await memory()
      const timed = async (action, expected) => {
        const start = performance.now()
        await action()
        if (expected !== undefined)
          await expect(page.locator('[data-task-id]')).toHaveCount(expected)
        await settle(page)
        return performance.now() - start
      }
      const search = await timed(
        () => page.getByRole('searchbox').fill('Portfolio'),
        Math.ceil(count / 10),
      )
      const clearSearch = await timed(() => page.getByRole('searchbox').fill(''), count)
      await page.getByRole('button', { name: /^Filters/ }).click()
      const filtering = await timed(
        () => page.getByLabel('Priority filter').selectOption('High'),
        Math.floor(count / 3),
      )
      await page.getByLabel('Priority filter').selectOption('All')
      const sorting = await timed(() => page.getByLabel('Sort by').selectOption('title'), count)
      const completion = await timed(() => page.getByRole('checkbox').first().click(), count - 1)
      const writeMs = await page.evaluate(() => window.auditWrites.at(-1))
      const storedBytes = await page.evaluate(
        () => new TextEncoder().encode(localStorage.getItem('still.tasks')).length,
      )
      for (let i = 0; i < 10; i++) {
        await page.getByRole('searchbox').fill('Portfolio')
        await expect(page.locator('[data-task-id]')).toHaveCount(Math.ceil(count / 10) - 1)
        await page.getByRole('searchbox').fill('')
        await expect(page.locator('[data-task-id]')).toHaveCount(count - 1)
      }
      await settle(page)
      const finalMemory = await memory()
      // A second equally sized cycle block distinguishes warm-up growth from continued retention.
      for (let i = 0; i < 10; i++) {
        await page.getByRole('searchbox').fill('Portfolio')
        await expect(page.locator('[data-task-id]')).toHaveCount(Math.ceil(count / 10) - 1)
        await page.getByRole('searchbox').fill('')
        await expect(page.locator('[data-task-id]')).toHaveCount(count - 1)
      }
      await settle(page)
      const steadyMemory = await memory()
      expect(errors).toEqual([])
      trials.push({
        render,
        search,
        clearSearch,
        filtering,
        sorting,
        completion,
        writeMs,
        storedBytes,
        initialMemory,
        finalMemory,
        steadyMemory,
      })
      await context.close()
    }
    const summary = Object.fromEntries(
      ['render', 'search', 'clearSearch', 'filtering', 'sorting', 'completion', 'writeMs'].map(
        (k) => [k, Number(median(trials.map((t) => t[k])).toFixed(2))],
      ),
    )
    results.push({ count, medianMs: summary, trials })
    console.log(label, count, summary)
  }
  const report = {
    label,
    measuredAt: new Date().toISOString(),
    platform: os.platform(),
    arch: os.arch(),
    cpu: os.cpus()[0]?.model,
    logicalCpus: os.cpus().length,
    memoryBytes: os.totalmem(),
    node: process.version,
    browser: browser.version(),
    trialsPerSize: 3,
    results,
  }
  await mkdir('docs/measurements', { recursive: true })
  await writeFile(
    `docs/measurements/phase4-performance-${label}.json`,
    JSON.stringify(report, null, 2) + '\n',
  )
} finally {
  await browser.close()
}
