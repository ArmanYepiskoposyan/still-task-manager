import type { Task } from '../../src/domain/task'

/** Synthetic, deterministic data only; never reads a user's workspace. */
export function syntheticTasks(count: number): Task[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `synthetic-${String(i).padStart(5, '0')}`,
    title: `${i % 10 === 0 ? 'Portfolio' : 'Review'} task ${String(i).padStart(5, '0')}`,
    notes:
      `Synthetic planning notes ${i}. Review the outline, check accessibility, and record a clear next step. `.repeat(
        3,
      ),
    completed: false,
    priority: (['Low', 'Normal', 'High'] as const)[i % 3]!,
    dueDate: `2026-10-${String(20 + (i % 10)).padStart(2, '0')}`,
    createdAt: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString(),
  }))
}
