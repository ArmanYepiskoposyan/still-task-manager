import { TaskRow } from './TaskRow'
import type { TaskRowActions } from './TaskRow'
import type { Task } from '../../domain/task'
export function TaskGroup({
  title,
  tasks,
  ...actions
}: TaskRowActions & { title: string; tasks: readonly Task[] }) {
  return (
    <section className="task-group" aria-label={title}>
      <div className="group-heading">
        <h3>
          {title} <span className="group-count">{tasks.length}</span>
        </h3>
      </div>
      <ul className="task-list">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} {...actions} />
        ))}
      </ul>
    </section>
  )
}
