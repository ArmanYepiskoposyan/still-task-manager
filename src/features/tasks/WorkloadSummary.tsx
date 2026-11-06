import { Icon } from '../../components/Icon'
import type { Workload } from '../../domain/taskSelection'
export function WorkloadSummary({
  counts,
  completedToday,
}: {
  counts: Workload
  completedToday: number
}) {
  const metrics = [
    { label: 'Incomplete', count: counts.open, color: 'indigo-dot' },
    { label: 'Due today', count: counts.dueToday, color: 'indigo-dot' },
    { label: 'Overdue', count: counts.overdue, color: 'amber-dot' },
    { label: 'Completed', count: counts.completed, color: 'green-dot' },
  ]
  return (
    <section className="summary" aria-label="Workload summary">
      <div className="summary-intro">
        <span className="summary-symbol">
          <Icon name="sun" size={24} />
        </span>
        <div>
          <strong>A little perspective</strong>
          <p>
            Across your workspace
            <br />
            {counts.total} total · {completedToday} completed today
          </p>
        </div>
      </div>
      <dl>
        {metrics.map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>
              {metric.count}
              <span className={`metric-dot ${metric.color}`} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
