import { isTimestamp } from '../../domain/task'
import type { WorkspaceData } from '../../domain/project'
import { deserializeTasks, serializeTasks } from './taskRepository'

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024
export function createBackup(data: WorkspaceData, now = new Date().toISOString()): string {
  if (!isTimestamp(now)) throw new Error('The current time is invalid. Check your device clock.')
  const text = JSON.stringify(
    {
      format: 'still-backup',
      version: 1,
      exportedAt: now,
      data: JSON.parse(serializeTasks(data.tasks, data.projects)),
    },
    null,
    2,
  )
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
    throw new Error(
      'This workspace exceeds the 10 MiB backup limit. Export is unavailable; download the raw document for recovery instead.',
    )
  return text
}
export function parseBackup(text: string): WorkspaceData {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
    throw new Error('Choose a JSON file no larger than 10 MiB (10,485,760 bytes).')
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON. Nothing has changed.')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('Choose a Still backup or a version-1 or version-2 workspace document.')
  const value = parsed as Record<string, unknown>
  let data: unknown = value
  if ('format' in value) {
    if (value.format !== 'still-backup' || value.version !== 1)
      throw new Error('This backup format or version is unsupported.')
    if (!isTimestamp(value.exportedAt))
      throw new Error('This backup has an invalid export timestamp.')
    data = value.data
  }
  if (data === undefined) throw new Error('This backup has no workspace data.')
  const { tasks, projects } = deserializeTasks(JSON.stringify(data))
  return { tasks, projects }
}
export async function readBackupFile(file: File): Promise<WorkspaceData> {
  if (file.size > MAX_BACKUP_BYTES)
    throw new Error('Choose a JSON file no larger than 10 MiB (10,485,760 bytes).')
  // FileReader works across the supported engines and avoids trusting the file extension/MIME.
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('The file could not be read. Try choosing it again.'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsText(file, 'UTF-8')
  })
  return parseBackup(text)
}
export function downloadText(text: string, filename: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Delay revocation for browser download handling, including WebKit.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
