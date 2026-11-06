import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ProjectDialog } from '../features/projects/ProjectDialog'
import { BackupDialog } from '../features/workspace/BackupDialog'
import { ShortcutHelp } from '../features/workspace/ShortcutHelp'
import { shortcutFor } from './shortcuts'
import { projectCounts } from '../domain/project'
import type { Project } from '../domain/project'
import { Icon } from '../components/Icon'
import type { IconName } from '../components/Icon'
import { GentleReminder } from '../components/GentleReminder'
import { WorkspaceState } from '../components/WorkspaceState'
import { WorkloadSummary } from '../features/tasks/WorkloadSummary'
import { TaskGroup } from '../features/tasks/TaskGroup'
import { TaskEditor } from '../features/tasks/TaskEditor'
import { DeleteTaskDialog } from '../features/tasks/DeleteTaskDialog'
import type { Task, TaskDraft } from '../domain/task'
import type { TaskRepository } from '../lib/persistence/taskRepository'
import { calendarDate } from '../lib/dates/calendar'
import { TasksProvider } from '../state/TasksProvider'
import { useTasks } from '../state/TasksContext'
import { useTheme } from './useTheme'
import type { Theme } from './useTheme'
import { useLocalDate } from './useLocalDate'

import {
  activeFilterCount,
  defaultFilters,
  defaultSelection,
  matchesSelection,
  selectTasks,
  workload,
  completedToday,
} from '../domain/taskSelection'
import type { TaskSelection, TaskView as View } from '../domain/taskSelection'
import { TaskToolbar } from '../features/tasks/TaskToolbar'
const emptyTasks: readonly Task[] = []
type Dialog =
  | { type: 'edit'; task: Task | null }
  | { type: 'delete'; task: Task }
  | { type: 'project'; project: Project | null; deleting?: boolean }
  | { type: 'backup' }
  | { type: 'shortcuts' }
const themes: { value: Theme; icon: IconName; label: string }[] = [
  { value: 'light', icon: 'sun', label: 'Light theme' },
  { value: 'dark', icon: 'moon', label: 'Dark theme' },
  { value: 'system', icon: 'monitor', label: 'System theme' },
]

export function App({ repository }: { repository?: TaskRepository }) {
  return (
    <TasksProvider repository={repository}>
      <Workspace />
    </TasksProvider>
  )
}
function Workspace() {
  const [projectId, setProjectId] = useState('')
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true)
  const [view, setView] = useState<View>('Open tasks')
  const [selection, setSelection] = useState<TaskSelection>(defaultSelection)
  const [placementNotice, setPlacementNotice] = useState('')
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const newTaskRef = useRef<HTMLButtonElement>(null)
  const service = useTasks()
  const { theme, setTheme, themeError } = useTheme()
  const today = useLocalDate()
  const tasks = service.snapshot?.tasks ?? emptyTasks
  const projects = service.snapshot?.projects ?? []
  const selectedProject = projects.find((project) => project.id === projectId)
  const viewLabel = view === 'Project' ? (selectedProject?.name ?? 'Project unavailable') : view
  const perProject = useMemo(() => projectCounts(tasks), [tasks])
  const doneToday = useMemo(() => completedToday(tasks, today), [tasks, today])
  const upcomingCount = tasks.filter(
    (task) => !task.completed && task.dueDate && task.dueDate > today,
  ).length
  const counts = useMemo(() => workload(tasks, today), [tasks, today])
  const { visible, groups, inViewCount } = useMemo(
    () => selectTasks(tasks, view, selection, today, projectId),
    [tasks, view, selection, today, projectId],
  )
  const narrowed = !!selection.query.trim() || activeFilterCount(selection.filters) > 0
  const navigation: { name: View; icon: IconName; count: number }[] = [
    { name: 'Today', icon: 'sun', count: counts.dueToday + counts.overdue },
    { name: 'Upcoming', icon: 'calendar', count: upcomingCount },
    { name: 'Open tasks', icon: 'lines', count: counts.open },
    { name: 'All tasks', icon: 'stack', count: counts.total },
    { name: 'Completed', icon: 'completed', count: counts.completed },
    { name: 'Unassigned', icon: 'lines', count: tasks.filter((task) => !task.projectId).length },
  ]
  const changeSelection = (next: TaskSelection) => {
    setSelection(next)
    setPlacementNotice('')
  }
  const showAllTasks = () => {
    setView('All tasks')
    setSelection(defaultSelection)
    setPlacementNotice('')
    document.getElementById('task-search')?.focus()
  }
  const taskSaved = (draft: TaskDraft) => {
    const task = dialog?.type === 'edit' ? dialog.task : null
    const candidate = {
      ...draft,
      title: draft.title.trim(),
      dueDate: draft.dueDate || undefined,
      completed: task?.completed ?? false,
    }
    if (
      !matchesSelection(candidate, view, selection, today) ||
      (view === 'Project' && (candidate.projectId || undefined) !== projectId)
    ) {
      setPlacementNotice(
        view === 'Today' && !candidate.dueDate
          ? 'Task saved without a due date. Find it in Open tasks or All tasks.'
          : `Task saved. It is outside the current ${view} results. Find it in All tasks.`,
      )
    } else setPlacementNotice('')
  }
  const showEditor = (task: Task | null, opener: HTMLElement) => {
    openerRef.current = opener
    setDialog({ type: 'edit', task })
  }
  const showDelete = (task: Task, opener: HTMLElement) => {
    openerRef.current = opener
    setDialog({ type: 'delete', task })
  }
  const showWorkspaceDialog = (next: Dialog, opener: HTMLElement) => {
    openerRef.current = opener
    setDialog(next)
  }
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const action = shortcutFor(
        event,
        shortcutsEnabled,
        !!dialog || !!document.querySelector('dialog[open]'),
      )
      if (!action) return
      if (action === 'new') {
        if (service.loadError) return
        event.preventDefault()
        openerRef.current = document.activeElement as HTMLElement
        setDialog({ type: 'edit', task: null })
      }
      if (action === 'search') {
        const input = document.getElementById('task-search')
        if (input) {
          event.preventDefault()
          input.focus()
        }
      }
      if (action === 'help') {
        event.preventDefault()
        openerRef.current = document.activeElement as HTMLElement
        setDialog({ type: 'shortcuts' })
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [dialog, shortcutsEnabled, service.loadError])
  const closeDialog = () => setDialog(null)
  const reloadSavedTasks = () => {
    service.reload()
    requestAnimationFrame(() => {
      const target = newTaskRef.current
      if (target && !target.disabled) target.focus()
      else document.getElementById('main')?.focus()
    })
  }
  useLayoutEffect(() => {
    if (dialog || !openerRef.current) return
    // Restore after React removes a deleted row, including synchronous dialog-close events.
    const opener = openerRef.current
    openerRef.current = null
    if (opener.isConnected && opener !== document.body) opener.focus()
    else newTaskRef.current?.focus()
  }, [dialog])
  const toggle = (task: Task, value: boolean, opener: HTMLElement) => {
    const row = opener.closest('li')
    const neighbor = (
      row?.nextElementSibling ?? row?.previousElementSibling
    )?.querySelector<HTMLInputElement>('input')
    const result = service.complete(task.id, value)
    if (result.ok)
      requestAnimationFrame(() => {
        if (!opener.isConnected) {
          if (neighbor?.isConnected) neighbor.focus()
          else newTaskRef.current?.focus()
        }
      })
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="app-shell">
        <aside className="sidebar" aria-label="Workspace sidebar">
          <div className="brand">
            <span className="brand-symbol">
              <Icon name="lines" size={23} />
            </span>
            <span>
              still<span className="brand-period">.</span>
            </span>
          </div>
          <div className="sidebar-workspace">
            <span className="workspace-avatar">
              <Icon name="leaf" size={17} />
            </span>
            <div>
              <strong>Personal workspace</strong>
              <span>A little space for your day</span>
            </div>
          </div>
          <span className="nav-caption eyebrow">YOUR WORKSPACE</span>
          <nav aria-label="Main navigation">
            {navigation.map((item) => (
              <button
                key={item.name}
                className={`nav-item ${view === item.name ? 'active' : ''}`}
                aria-label={service.loadError ? item.name : `${item.name}, ${item.count} tasks`}
                aria-current={view === item.name ? 'page' : undefined}
                onClick={() => {
                  setView(item.name)
                  setPlacementNotice('')
                }}
              >
                <Icon name={item.icon} />
                <span>{item.name}</span>
                {!service.loadError && <span className="nav-count">{item.count}</span>}
              </button>
            ))}
          </nav>
          <section className="project-navigation" aria-label="Projects">
            <label className="eyebrow" htmlFor="project-browser">
              PROJECTS
            </label>
            <select
              id="project-browser"
              value={view === 'Project' && selectedProject ? projectId : ''}
              disabled={!!service.loadError}
              onChange={(event) => {
                setProjectId(event.target.value)
                setView(event.target.value ? 'Project' : 'Open tasks')
                setPlacementNotice('')
              }}
            >
              <option value="">Choose a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({perProject.get(project.id) ?? 0})
                </option>
              ))}
            </select>
            <div className="project-actions">
              <button
                className="text-button"
                disabled={!!service.loadError}
                onClick={(event) =>
                  showWorkspaceDialog({ type: 'project', project: null }, event.currentTarget)
                }
              >
                New project
              </button>
              {view === 'Project' && selectedProject && (
                <>
                  <button
                    className="icon-button"
                    aria-label="Edit selected project"
                    onClick={(event) =>
                      showWorkspaceDialog(
                        { type: 'project', project: selectedProject },
                        event.currentTarget,
                      )
                    }
                  >
                    <Icon name="edit" size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Delete selected project"
                    onClick={(event) =>
                      showWorkspaceDialog(
                        { type: 'project', project: selectedProject, deleting: true },
                        event.currentTarget,
                      )
                    }
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </>
              )}
            </div>
          </section>
          <div className="workspace-utilities">
            <button
              className="text-button"
              onClick={(event) => showWorkspaceDialog({ type: 'backup' }, event.currentTarget)}
            >
              Backup & restore
            </button>
            <button
              className="text-button"
              onClick={(event) => showWorkspaceDialog({ type: 'shortcuts' }, event.currentTarget)}
            >
              Keyboard shortcuts
            </button>
          </div>
          <div className="sidebar-bottom">
            <div className="sidebar-note">
              <Icon name="leaf" size={22} />
              <p>
                Less noise.
                <br />
                More space to focus.
              </p>
              <span>One thoughtful step at a time.</span>
            </div>
            <div className="phase-label">
              <span className="status-dot" />
              LOCAL ONLY <span>On this device</span>
            </div>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumbs">
              <span>My workspace</span>
              <Icon name="chevron" size={12} />
              <strong>{viewLabel}</strong>
            </div>
            <div className="topbar-tools">
              <span className="demo-pill">
                <span />
                On this device
              </span>
              <div className="theme-switch" role="group" aria-label="Color theme">
                {themes.map((item) => (
                  <button
                    key={item.value}
                    aria-label={item.label}
                    aria-pressed={theme === item.value}
                    onClick={() => setTheme(item.value)}
                  >
                    <Icon name={item.icon} size={16} />
                  </button>
                ))}
              </div>
            </div>
          </header>
          <main id="main" tabIndex={-1}>
            <div className="page-heading">
              <div>
                <p className="date-line">
                  <time dateTime={today}>
                    {new Intl.DateTimeFormat('en', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    }).format(calendarDate(today))}
                  </time>
                </p>
                <h1>
                  {viewLabel}
                  <span className="heading-dot">.</span>
                </h1>
                <p className="page-description">
                  {view === 'Upcoming'
                    ? 'A little space for what comes next.'
                    : view === 'Project' || view === 'Unassigned'
                      ? 'Related plans, with room to grow.'
                      : view === 'Today'
                        ? 'A little focus for the day ahead.'
                        : view === 'Open tasks'
                          ? 'A little structure. More room to think.'
                          : view === 'All tasks'
                            ? 'Everything in one place. One step at a time.'
                            : 'Small steps, thoughtfully taken.'}
                </p>
              </div>
              <button
                ref={newTaskRef}
                disabled={!!service.loadError}
                className="button primary new-task"
                onClick={(event) => showEditor(null, event.currentTarget)}
              >
                <Icon name="plus" size={18} />
                New task
              </button>
            </div>
            <div className="sr-only" role="status" aria-live="polite">
              {service.notice}
            </div>
            {themeError && (
              <p className="storage-banner" role="alert">
                {themeError}
              </p>
            )}
            {service.mutationError && !service.loadError && (
              <div className="storage-banner" role="alert">
                <div>
                  <Icon name="warning" size={18} />
                  <p>Last save attempt: {service.mutationError}</p>
                </div>
                <button className="button secondary" onClick={reloadSavedTasks}>
                  Reload saved tasks
                </button>
              </div>
            )}
            {placementNotice && !service.loadError && (
              <div className="placement-notice">
                <p role="status">{placementNotice}</p>
                <button className="button secondary" onClick={showAllTasks}>
                  Show all tasks
                </button>
              </div>
            )}
            {service.loadError ? (
              <WorkspaceState
                error={service.loadError}
                view={view}
                onCreate={(opener) => showEditor(null, opener)}
                onRetry={reloadSavedTasks}
              />
            ) : (
              <>
                <WorkloadSummary counts={counts} completedToday={doneToday} />
                <TaskToolbar
                  selection={selection}
                  onChange={changeSelection}
                  resultCount={visible.length}
                  viewCount={inViewCount}
                  view={viewLabel}
                />
                {visible.length === 0 ? (
                  <WorkspaceState
                    error={null}
                    narrowed={narrowed}
                    onClear={() => {
                      document.getElementById('task-search')?.focus()
                      changeSelection({ ...selection, query: '', filters: { ...defaultFilters } })
                    }}
                    onBrowse={() => {
                      document.getElementById('task-search')?.focus()
                      setView('Open tasks')
                      changeSelection(defaultSelection)
                    }}
                    view={view}
                    onCreate={(opener) => showEditor(null, opener)}
                    onRetry={reloadSavedTasks}
                  />
                ) : (
                  <div className="content-grid">
                    <div className="tasks-panel">
                      <div className="list-title">
                        <h2>
                          {view === 'Today'
                            ? 'Your daily rhythm'
                            : view === 'Completed'
                              ? 'A little progress'
                              : view === 'All tasks'
                                ? 'The full picture'
                                : 'One step at a time'}
                        </h2>
                        <span>
                          <Icon name="lines" size={15} />
                          {visible.length} {visible.length === 1 ? 'task' : 'tasks'}
                        </span>
                      </div>
                      {groups.map((group) => (
                        <TaskGroup
                          key={group.title}
                          title={group.title}
                          tasks={group.tasks}
                          onEdit={showEditor}
                          onDelete={showDelete}
                          onComplete={toggle}
                        />
                      ))}
                      <p className="list-footnote">
                        <Icon name="lock" size={14} />
                        Saved in this browser. Select a task to edit its details.
                      </p>
                    </div>
                    <GentleReminder />
                  </div>
                )}
              </>
            )}
            <footer className="page-footer">
              <span>Made for a little more clarity.</span>
              <span>
                STILL <span className="footer-dash">/</span> YOUR PERSONAL WORKSPACE
              </span>
            </footer>
          </main>
        </div>
      </div>
      {dialog?.type === 'edit' && (
        <TaskEditor
          key={dialog.task?.id ?? 'new'}
          task={dialog.task}
          onClose={closeDialog}
          onSaved={taskSaved}
          defaultProjectId={view === 'Project' ? selectedProject?.id : undefined}
        />
      )}
      {dialog?.type === 'project' && (
        <ProjectDialog
          project={dialog.project}
          deleting={dialog.deleting}
          onClose={closeDialog}
          onDeleted={() => {
            setView('Unassigned')
            setProjectId('')
          }}
        />
      )}
      {dialog?.type === 'backup' && (
        <BackupDialog
          onClose={closeDialog}
          onRestored={() => {
            setView('All tasks')
            setProjectId('')
            setSelection(defaultSelection)
            setPlacementNotice('')
          }}
        />
      )}
      {dialog?.type === 'shortcuts' && (
        <ShortcutHelp
          enabled={shortcutsEnabled}
          onEnabled={setShortcutsEnabled}
          onClose={closeDialog}
        />
      )}
      {dialog?.type === 'delete' && <DeleteTaskDialog task={dialog.task} onClose={closeDialog} />}
    </>
  )
}
