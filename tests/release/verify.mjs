import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { chromium, firefox, webkit, expect } from '@playwright/test'

// Serve the exact production directory with ordinary static-file semantics.
// No Vite development fallback: missing root-relative assets under a subpath fail.
const directory = resolve('dist')
const index = await readFile(resolve(directory, 'index.html'), 'utf8')
if (/\b(?:src|href)=["']\/(?!\/)/.test(index))
  throw new Error('The build contains root-relative asset URLs.')
if (index.includes('/src/main.tsx'))
  throw new Error('Unbuilt TypeScript entry found in production HTML.')
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
}
const results = []
for (const base of ['/', '/java-task-manager/']) {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
      if (!pathname.startsWith(base)) {
        response.writeHead(404).end()
        return
      }
      const relative = pathname.slice(base.length) || 'index.html'
      const path = resolve(directory, relative)
      if (!path.startsWith(directory + sep) || !(await stat(path)).isFile()) {
        response.writeHead(404).end()
        return
      }
      response
        .writeHead(200, {
          'Content-Type': types[extname(path)] ?? 'application/octet-stream',
          'X-Content-Type-Options': 'nosniff',
        })
        .end(await readFile(path))
    } catch {
      response.writeHead(404).end()
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}${base}`
  try {
    for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
      const browser = await engine.launch(name === 'chromium' ? { channel: 'chromium' } : {})
      try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
        const page = await context.newPage()
        const errors = [],
          failed = [],
          outside = []
        page.on('pageerror', (error) => errors.push(error.message))
        page.on('requestfailed', (request) => failed.push(request.url()))
        page.on('response', (response) => {
          if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`)
        })
        page.on('request', (request) => {
          if (/^https?:/.test(request.url()) && !request.url().startsWith(url))
            outside.push(request.url())
        })
        await page.goto(url)
        await expect(page.getByRole('heading', { name: 'Open tasks.', exact: true })).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        expect(await page.evaluate(() => document.fonts.check('14px "DM Sans Variable"'))).toBe(
          true,
        )
        await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
        await page.getByRole('button', { name: 'New project', exact: true }).click()
        await page.getByLabel('Project name').fill('Release verification')
        await page.getByRole('button', { name: 'Create project', exact: true }).click()
        const id = await page.evaluate(
          () => JSON.parse(localStorage.getItem('still.tasks')).projects[0].id,
        )
        await page.getByLabel('PROJECTS', { exact: true }).selectOption(id)
        await page.getByRole('button', { name: 'New task', exact: true }).click()
        await page.getByLabel('Task title').fill('Synthetic release check 🌿')
        await page.getByRole('button', { name: 'Create task', exact: true }).click()
        await page.reload()
        await expect(
          page.getByRole('button', { name: 'Edit task: Synthetic release check 🌿', exact: true }),
        ).toBeVisible()
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
        await page.getByRole('button', { name: 'Backup & restore', exact: true }).click()
        const download = page.waitForEvent('download')
        await page.getByRole('button', { name: 'Download backup', exact: true }).click()
        const file = await download
        const stream = await file.createReadStream()
        const chunks = []
        for await (const chunk of stream) chunks.push(chunk)
        const backup = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        expect(backup.data.tasks).toHaveLength(1)
        expect(backup.data.projects).toHaveLength(1)
        expect(backup.data.tasks[0].projectId).toBe(id)
        await page.keyboard.press('Escape')
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
        expect(errors).toEqual([])
        expect(failed).toEqual([])
        expect(outside).toEqual([])
        results.push({
          engine: name,
          base,
          passed: true,
          pageErrors: errors.length,
          failedRequests: failed.length,
          externalRequests: outside.length,
        })
        await context.close()
      } finally {
        await browser.close()
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}
console.log(JSON.stringify({ productionRoot: 'dist', cases: results.length, results }, null, 2))
