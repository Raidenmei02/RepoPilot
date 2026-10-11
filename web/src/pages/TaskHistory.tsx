import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { sampleQuestion } from '../data'
import { formatWhen, kindLabel, shortSha } from '../lib/format'
import { useRepoPilot } from '../pilot-context'
import type { RunKind, RunStatus } from '../types'

export function TaskHistory() {
  const { tasks, createAnalyze, ingestPullRequest } = useRepoPilot()
  const navigate = useNavigate()
  const [kind, setKind] = useState<RunKind | 'all'>('all')
  const [status, setStatus] = useState<RunStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const rows = tasks.filter((task) => {
    if (kind !== 'all' && task.kind !== kind) return false
    if (status !== 'all' && task.status !== status) return false
    const blob = `${task.id} ${task.title} ${task.repoName} ${task.question}`.toLowerCase()
    return blob.includes(query.trim().toLowerCase())
  })

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>任务记录</h1>
          <p>刷新之后仍用 run_id 找回同一次运行。重复投递已经评论过的 SHA 不会再发评论。</p>
        </div>
      </div>
      <div className="history-filters">
        <label>
          搜索
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="run_id、仓库或问题" />
        </label>
        <label>
          种类
          <select value={kind} onChange={(event) => setKind(event.target.value as RunKind | 'all')}>
            <option value="all">全部</option>
            <option value="analyze">项目分析</option>
            <option value="review">PR 审核</option>
          </select>
        </label>
        <label>
          状态
          <select value={status} onChange={(event) => setStatus(event.target.value as RunStatus | 'all')}>
            <option value="all">全部</option>
            <option value="queued">等待中</option>
            <option value="preparing">准备中</option>
            <option value="indexing">索引中</option>
            <option value="analyzing">分析中</option>
            <option value="scanning">扫描中</option>
            <option value="reviewing">组织评论</option>
            <option value="completed">已完成</option>
            <option value="commented">已评论</option>
            <option value="failed">失败</option>
            <option value="cancelled">已取消</option>
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>运行</th>
              <th>种类</th>
              <th>Commit</th>
              <th>状态</th>
              <th>更新</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((task) => (
              <tr key={task.id}>
                <td>
                  <Link to={`/tasks/${task.id}`}>
                    <strong>{task.id}</strong>
                    <div>{task.title}</div>
                  </Link>
                </td>
                <td>{kindLabel(task.kind)}</td>
                <td className="mono">{shortSha(task.commit)}</td>
                <td>
                  <StatusBadge status={task.status} />
                </td>
                <td>{formatWhen(task.updatedAt)}</td>
                <td>
                  {task.kind === 'analyze' ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        const id = createAnalyze({
                          repoId: task.repoId,
                          branch: task.branch,
                          commit: task.commit,
                          question: task.question || sampleQuestion,
                        })
                        if (id) navigate(`/tasks/${id}`)
                      }}
                    >
                      再分析一次
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        const id = ingestPullRequest(task.repoId, task.commit)
                        if (id) navigate(`/tasks/${id}`)
                      }}
                    >
                      再次投递
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
