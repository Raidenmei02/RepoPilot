import { Link, useParams } from 'react-router-dom'
import { InstallBadge, StatusBadge } from '../components/StatusBadge'
import { formatWhen, kindLabel, repoAddress, shortSha } from '../lib/format'
import { useRepoPilot } from '../pilot-context'

export function RepoDetail() {
  const { repoId = '' } = useParams()
  const { repos, tasks } = useRepoPilot()
  const repo = repos.find((item) => item.id === repoId)
  if (!repo) {
    return (
      <div className="page">
        <div className="empty">
          <h1>仓库不在名单里</h1>
          <Link className="btn" to="/repos">
            返回
          </Link>
        </div>
      </div>
    )
  }
  const runs = tasks.filter((task) => task.repoId === repo.id)
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{repoAddress(repo.owner, repo.name)}</h1>
          <p>
            {repo.language} · 默认分支 {repo.defaultBranch} · {repo.allowed ? '允许检出' : '拒绝检出'}
          </p>
        </div>
        <InstallBadge status={repo.installation} />
      </div>
      <section className="block">
        <div className="block-head">
          <h2>分支</h2>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>分支</th>
                <th>Commit</th>
              </tr>
            </thead>
            <tbody>
              {repo.branches.map((branch) => (
                <tr key={branch.name}>
                  <td className="mono">{branch.name}</td>
                  <td className="mono">{shortSha(branch.commit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="block" style={{ marginTop: 16 }}>
        <div className="block-head">
          <h2>相关运行</h2>
          <Link to="/tasks/new">新建分析</Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>运行</th>
                <th>种类</th>
                <th>状态</th>
                <th>更新</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((task) => (
                <tr key={task.id}>
                  <td>
                    <Link to={`/tasks/${task.id}`}>{task.id}</Link>
                  </td>
                  <td>{kindLabel(task.kind)}</td>
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
