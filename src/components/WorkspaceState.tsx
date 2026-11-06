import { Icon } from './Icon'
import type { TaskView } from '../domain/taskSelection'
export function WorkspaceState({
  error,
  view,
  onCreate,
  onRetry,
  narrowed = false,
  onClear,
  onBrowse,
}: {
  error: string | null
  view: TaskView
  onCreate: (opener: HTMLElement) => void
  onRetry: () => void
  narrowed?: boolean
  onClear?: () => void
  onBrowse?: () => void
}) {
  const noResults = !error && narrowed
  const upcomingEmpty = !error && !noResults && view === 'Upcoming'
  const todayEmpty = !error && !noResults && view === 'Today'
  return (
    <section
      className={`state-panel ${error ? 'error-panel' : ''}`}
      aria-labelledby="state-heading"
    >
      <div className="state-art" aria-hidden="true">
        <span className="state-art-ring" />
        <Icon name={error ? 'warning' : noResults ? 'search' : 'leaf'} size={34} />
      </div>
      <p className="eyebrow">
        {error
          ? 'LET’S TAKE A MOMENT'
          : noResults
            ? 'A LITTLE SPACE TO LOOK AGAIN'
            : 'A LITTLE BREATHING ROOM'}
      </p>
      <h2 id="state-heading">
        {error
          ? 'Your tasks couldn’t be loaded.'
          : noResults
            ? 'No matching tasks.'
            : upcomingEmpty
              ? 'Nothing on the horizon yet.'
              : todayEmpty
                ? 'A little breathing room today.'
                : view === 'Completed'
                  ? 'Good things take a little time.'
                  : 'Room for a fresh start.'}
      </h2>
      <p>
        {error
          ? 'Your saved data has not been replaced. Resolve the storage problem, then retry loading your workspace.'
          : noResults
            ? `No tasks in ${view} match this search and these filters. Your workspace may still contain other tasks.`
            : upcomingEmpty
              ? 'Incomplete tasks with a future due date appear here, grouped by day. Add a date to a task to plan ahead.'
              : todayEmpty
                ? 'No incomplete tasks are overdue or due today. Future plans and tasks without deadlines stay in Open tasks.'
                : view === 'Completed'
                  ? 'Tasks you complete will appear here. Every small step counts.'
                  : 'Every good day starts with a little space. When you’re ready, give your next step a name.'}
      </p>
      {error && (
        <div className="error-detail" role="alert">
          <Icon name="info" size={17} />
          <span>{error}</span>
        </div>
      )}
      <button
        className={`button ${error || noResults || todayEmpty ? 'secondary' : 'primary'}`}
        onClick={(event) =>
          error
            ? onRetry()
            : noResults
              ? onClear?.()
              : todayEmpty
                ? onBrowse?.()
                : onCreate(event.currentTarget)
        }
      >
        <Icon name={error || noResults || todayEmpty ? 'arrow' : 'plus'} size={17} />
        {error
          ? 'Retry loading tasks'
          : noResults
            ? 'Clear search and filters'
            : todayEmpty
              ? 'View open tasks'
              : 'Create a task'}
      </button>
      <span className="state-caption">
        {error
          ? 'Existing data stays untouched until it can be read safely.'
          : noResults
            ? 'Search and filters never change your saved tasks.'
            : 'A little structure. More room to think.'}
      </span>
    </section>
  )
}
