import { useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { activeFilterCount, defaultFilters } from '../../domain/taskSelection'
import type { TaskFilters, TaskSelection, TaskSort } from '../../domain/taskSelection'

export function TaskToolbar({
  selection,
  onChange,
  resultCount,
  viewCount,
  view,
}: {
  selection: TaskSelection
  onChange: (selection: TaskSelection) => void
  resultCount: number
  viewCount: number
  view: string
}) {
  const [expanded, setExpanded] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const active = activeFilterCount(selection.filters)
  const updateFilter = <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) =>
    onChange({ ...selection, filters: { ...selection.filters, [key]: value } })
  return (
    <section className="task-tools" aria-label="Search, filter and sort tasks">
      <div className="task-tools-row">
        <div className="task-search">
          <Icon name="search" size={18} />
          <label className="sr-only" htmlFor="task-search">
            Search tasks
          </label>
          <input
            ref={searchRef}
            id="task-search"
            type="search"
            placeholder="Search titles and notes"
            value={selection.query}
            onChange={(event) => onChange({ ...selection, query: event.target.value })}
          />
          {selection.query && (
            <button
              className="icon-button"
              aria-label="Clear search"
              onClick={() => {
                onChange({ ...selection, query: '' })
                searchRef.current?.focus()
              }}
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
        <button
          className={`button secondary filter-toggle ${active ? 'has-filters' : ''}`}
          aria-expanded={expanded}
          aria-controls="task-filters"
          onClick={() => setExpanded(!expanded)}
        >
          <Icon name="filter" size={16} />
          Filters{active > 0 && <span className="filter-count">{active}</span>}
        </button>
        <div className="task-sort">
          <label htmlFor="task-sort">Sort by</label>
          <select
            id="task-sort"
            value={selection.sort}
            onChange={(event) => onChange({ ...selection, sort: event.target.value as TaskSort })}
          >
            <option value="due">Due date, earliest first</option>
            <option value="priority">Priority, highest first</option>
            <option value="newest">Newest created</option>
            <option value="oldest">Oldest created</option>
            <option value="title">Title, alphabetical</option>
          </select>
        </div>
      </div>
      <div id="task-filters" className="filter-panel" hidden={!expanded}>
        <div className="filter-fields">
          <div>
            <label htmlFor="filter-status">Status</label>
            <select
              id="filter-status"
              value={selection.filters.status}
              onChange={(event) =>
                updateFilter('status', event.target.value as TaskFilters['status'])
              }
            >
              {['All', 'Incomplete', 'Completed'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-priority">Priority filter</label>
            <select
              id="filter-priority"
              value={selection.filters.priority}
              onChange={(event) =>
                updateFilter('priority', event.target.value as TaskFilters['priority'])
              }
            >
              {['All', 'Low', 'Normal', 'High'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-due">Deadline filter</label>
            <select
              id="filter-due"
              value={selection.filters.due}
              onChange={(event) => updateFilter('due', event.target.value as TaskFilters['due'])}
            >
              {['Any', 'Overdue', 'Today', 'Upcoming', 'No due date'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="filter-help">
          Filters narrow {view}. Overdue excludes completed tasks. Today and Upcoming match
          deadlines; Status controls completion.
        </p>
      </div>
      <div className="result-line">
        <p role="status" aria-live="polite" aria-atomic="true">
          {resultCount} of {viewCount} {viewCount === 1 ? 'task' : 'tasks'} in {view}
          {selection.query.trim() ? ' · Search applied' : ''}
        </p>
        {active > 0 && (
          <button
            className="text-button"
            onClick={() => {
              onChange({ ...selection, filters: { ...defaultFilters } })
              searchRef.current?.focus()
            }}
          >
            Reset filters
          </button>
        )}
      </div>
      {active > 0 && (
        <ul className="active-filters" aria-label="Active filters">
          {selection.filters.status !== 'All' && <li>Status: {selection.filters.status}</li>}
          {selection.filters.priority !== 'All' && <li>Priority: {selection.filters.priority}</li>}
          {selection.filters.due !== 'Any' && <li>Due: {selection.filters.due}</li>}
        </ul>
      )}
    </section>
  )
}
