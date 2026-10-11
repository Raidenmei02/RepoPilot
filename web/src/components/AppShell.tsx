import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useMatch, useParams } from 'react-router-dom'
import { kindLabel, repoAddress, shortSha } from '../lib/format'
import { useRepoPilot } from '../pilot-context'
import { useTheme } from '../theme-state'
import { ConnectionPill, StatusBadge } from './StatusBadge'
import { IconDashboard, IconExperiment, IconHistory, IconPlus, IconRepo, IconSettings, LogoMark } from './Icons'

const NAV = [
  { to: '/', label: '工作台', icon: IconDashboard, match: (path: string) => path === '/' },
  { to: '/repos', label: '代码仓库', icon: IconRepo, match: (path: string) => path.startsWith('/repos') },
  { to: '/tasks', label: '任务记录', icon: IconHistory, match: (path: string) => path === '/tasks' || /^\/tasks\/(?!new$).+/.test(path) },
  { to: '/experiments', label: '评测实验', icon: IconExperiment, match: (path: string) => path.startsWith('/experiments') },
  { to: '/settings', label: '设置', icon: IconSettings, match: (path: string) => path.startsWith('/settings') },
]

function crumb(path: string, taskId?: string, repoName?: string): string {
  if (path === '/') return '工作台 / 概览'
  if (path === '/tasks/new') return '工作台 / 新建分析'
  if (path === '/tasks') return '任务记录'
  if (taskId && path.endsWith('/report')) return `任务记录 / ${taskId} / 报告`
  if (taskId) return `任务记录 / ${taskId}`
  if (path === '/repos') return '代码仓库'
  if (repoName) return `代码仓库 / ${repoName}`
  if (path.startsWith('/experiments')) return '评测实验'
  if (path.startsWith('/settings')) return '设置'
  return 'RepoPilot'
}

export function AppShell() {
  const location = useLocation()
  const params = useParams()
  const { tasks, repos, currentRepoId, setCurrentRepoId, toasts, dismissToast } = useRepoPilot()
  const { theme, setTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const taskMatch = useMatch('/tasks/:taskId')
  const repoMatch = useMatch('/repos/:repoId')
  const taskId = params.taskId && params.taskId !== 'new' ? params.taskId : undefined
  const task = tasks.find((item) => item.id === taskId)
  const repo = repos.find((item) => item.id === (repoMatch?.params.repoId ?? ''))
  const currentRepo = repos.find((item) => item.id === currentRepoId) ?? repos[0]
  const flush = Boolean(taskMatch && taskMatch.params.taskId !== 'new')

  useEffect(() => {
    const page = crumb(location.pathname, task?.id, repo?.name)
    document.title = `${page} · RepoPilot`
  }, [location.pathname, task?.id, repo?.name])

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <LogoMark />
          <div>
            <strong>RepoPilot</strong>
            <span>只读代码理解</span>
          </div>
        </div>
        <NavLink to="/tasks/new" className={({ isActive }) => `nav-create${isActive ? ' is-active' : ''}`}>
          <IconPlus />
          新建分析
        </NavLink>
        <div className="nav-label">Workspace</div>
        <nav aria-label="主导航">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = item.match(location.pathname)
            return (
              <Link key={item.to} to={item.to} className={`nav-item${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
                <Icon />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="sidebar-foot">本地演示 · 不外发模型请求</div>
      </aside>
      <div className="shell-main">
        <header className="topbar">
          <div className="crumbs">{crumb(location.pathname, task?.id, repo?.name)}</div>
          {task ? (
            <div className="top-meta">
              <span className="mono">{task.repoName}</span>
              <span className="mono">{task.branch}</span>
              <span className="mono" title={task.commit}>
                {shortSha(task.commit)}
              </span>
              <span>{kindLabel(task.kind)}</span>
              <StatusBadge status={task.status} />
              <ConnectionPill state={task.connection} />
            </div>
          ) : (
            <label className="repo-switch">
              <span>当前仓库</span>
              <select
                value={currentRepo?.id ?? ''}
                onChange={(event) => setCurrentRepoId(event.target.value)}
                disabled={repos.length === 0}
              >
                {repos.length === 0 ? <option value="">没有仓库</option> : null}
                {repos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {repoAddress(item.owner, item.name)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            className="theme-toggle"
            aria-pressed={theme === 'night'}
            onClick={() => setTheme(theme === 'night' ? 'day' : 'night')}
          >
            {theme === 'night' ? '日间' : '夜间'}
          </button>
          <div className="user-wrap">
            <button type="button" className="user-btn" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}>
              <span className="avatar">本</span>
              本地会话
            </button>
            {menuOpen ? (
              <div className="user-menu">
                <strong>演示用户</strong>
                <p>没有登录账号。设置和任务都留在这个浏览器会话里。</p>
                <NavLink to="/settings" onClick={() => setMenuOpen(false)}>
                  打开设置
                </NavLink>
              </div>
            ) : null}
          </div>
        </header>
        <main className={flush ? 'content flush' : 'content'}>
          <Outlet />
        </main>
      </div>
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <button key={toast.id} type="button" className={`toast toast-${toast.tone}`} onClick={() => dismissToast(toast.id)}>
            {toast.text}
          </button>
        ))}
      </div>
    </div>
  )
}
