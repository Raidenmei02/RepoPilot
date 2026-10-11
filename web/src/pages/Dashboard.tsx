import { Link, useNavigate } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { formatWhen, greeting, kindLabel, shortSha } from '../lib/format'
import { useRepoPilot } from '../pilot-context'
import type { RunStatus } from '../types'

const LIVE: RunStatus[] = ['queued', 'preparing', 'indexing', 'analyzing', 'scanning', 'reviewing']

export function Dashboard() {
  const { tasks, repos, ingestPullRequest } = useRepoPilot()
  const navigate = useNavigate()
  const live = tasks.filter((task) => LIVE.includes(task.status))
  const commented = tasks.filter((task) => task.status === 'commented')
  const dropped = tasks.filter((task) => task.connection === 'disconnected' && LIVE.includes(task.status))
  const recent = [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{greeting()}，先看这个仓库怎么工作</h1>
          <p>第一版只做两件事：围绕一个问题读 Go 代码，或审核一次 Pull Request 的 diff。不改代码，不批准，不合并。</p>
        </div>
        <div className="run-actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              const id = ingestPullRequest('mypaper')
              if (id) navigate(`/tasks/${id}`)
            }}
          >
            接收 PR 新 head
          </button>
          <Link className="btn btn-primary" to="/tasks/new">
            新建分析
          </Link>
        </div>
      </div>

      <section className="metrics" aria-label="运行概览">
        <div>
          <span>全部运行</span>
          <strong>{tasks.length}</strong>
          <em>分析和审核</em>
        </div>
        <div>
          <span>进行中</span>
          <strong>{live.length}</strong>
          <em>检出、索引、分析或扫描</em>
        </div>
        <div>
          <span>已评论</span>
          <strong>{commented.length}</strong>
          <em>只发表评论型 review</em>
        </div>
        <div>
          <span>允许的仓库</span>
          <strong>{repos.filter((repo) => repo.allowed).length}</strong>
          <em>名单之外直接拒绝</em>
        </div>
      </section>

      {dropped.map((task) => (
        <div key={task.id} className="notice notice-bad" style={{ marginTop: 16 }}>
          <div>
            <strong>{task.id} 的事件流中断了</strong>
            <p>已完成的检出和索引还在。用这个 run_id 重新连接后，从当前步骤继续。</p>
          </div>
          <Link className="btn" to={`/tasks/${task.id}`}>
            打开 {task.id}
          </Link>
        </div>
      ))}

      <section className="block" style={{ marginTop: 16 }}>
        <div className="block-head">
          <h2>最近的运行</h2>
          <Link to="/tasks">全部记录</Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>运行</th>
                <th>种类</th>
                <th>仓库</th>
                <th>Commit</th>
                <th>状态</th>
                <th>更新</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((task) => (
                <tr key={task.id}>
                  <td>
                    <Link to={`/tasks/${task.id}`}>
                      <strong>{task.id}</strong>
                      <div>{task.title}</div>
                    </Link>
                  </td>
                  <td>{kindLabel(task.kind)}</td>
                  <td className="mono">{task.repoName}</td>
                  <td className="mono" title={task.commit}>
                    {shortSha(task.commit)}
                  </td>
                  <td>
                    <StatusBadge status={task.status} />
                  </td>
                  <td>{formatWhen(task.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
