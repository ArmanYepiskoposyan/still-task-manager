import { expect, type Page } from '@playwright/test'
import { createBackup } from '../../src/lib/persistence/backup'
import { createTask } from '../../src/domain/task'
export const phase5At = '2026-11-02T12:00:00.000Z'
export const phase5Projects = [
  { id: 'garden', name: 'A greener home', createdAt: phase5At, updatedAt: phase5At },
  { id: 'portfolio', name: 'Portfolio refresh', createdAt: phase5At, updatedAt: phase5At },
]
export const phase5Tasks = [
  createTask(
    {
      title: 'Bring a little green indoors',
      notes: 'Choose a sunny corner for the basil and mint.',
      priority: 'Low',
      dueDate: '2026-11-03',
      projectId: 'garden',
    },
    'basil',
    phase5At,
  ),
  createTask(
    {
      title: 'Write the story behind the work',
      notes: 'A clear opening, a thoughtful process, and what changed.',
      priority: 'High',
      dueDate: '2026-11-03',
      projectId: 'portfolio',
    },
    'story',
    phase5At,
  ),
  createTask(
    {
      title: 'Review the final case study',
      notes: 'Leave room for a fresh perspective.',
      priority: 'Normal',
      dueDate: '2026-11-06',
      projectId: 'portfolio',
    },
    'review',
    phase5At,
  ),
  createTask(
    {
      title: 'Make space for a quiet morning',
      notes: '',
      priority: 'Normal',
      dueDate: '2026-11-02',
    },
    'morning',
    phase5At,
  ),
  createTask(
    {
      title: 'Collect the design references',
      notes: '',
      priority: 'High',
      dueDate: '2026-11-01',
      projectId: 'portfolio',
    },
    'references',
    phase5At,
  ),
  {
    ...createTask(
      { title: 'Clear a little space on the desk', notes: '', priority: 'Low', dueDate: '' },
      'desk',
      phase5At,
    ),
    completed: true,
    completedAt: phase5At,
  },
]
export const phase5Data = { tasks: phase5Tasks, projects: phase5Projects }
export const phase5Backup = createBackup(phase5Data, phase5At)
export async function seedPhase5(page: Page) {
  await page.clock.setFixedTime(new Date(phase5At))
  await page.goto('/')
  await page.evaluate(
    (data) => localStorage.setItem('still.tasks', JSON.stringify({ version: 2, ...data })),
    phase5Data,
  )
  await page.reload()
}
export async function chooseBackup(page: Page, text = phase5Backup) {
  await page.getByLabel('Choose JSON file', { exact: true }).setInputFiles({
    name: 'still-synthetic-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(text),
  })
}
export async function previewBackup(page: Page, text = phase5Backup) {
  await page.getByRole('button', { name: 'Backup & restore', exact: true }).click()
  await chooseBackup(page, text)
  await expect(page.getByRole('heading', { name: 'Import preview', exact: true })).toBeVisible()
}
export async function confirmBackup(page: Page) {
  await page
    .getByRole('checkbox', {
      name: 'I understand that this replaces all current tasks and projects.',
    })
    .check()
  await page.getByRole('button', { name: 'Replace workspace', exact: true }).click()
}
export async function rawSaved(page: Page) {
  return page.evaluate(() => localStorage.getItem('still.tasks'))
}
export async function newProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'New project', exact: true }).click()
  await page.getByLabel('Project name', { exact: false }).fill(name)
  await page.getByRole('button', { name: 'Create project', exact: true }).click()
}
