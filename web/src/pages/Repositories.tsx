import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GitHubRepoPicker } from '../components/GitHubRepoPicker'
import { Modal } from '../components/Modal'
import { InstallBadge } from '../components/StatusBadge'
import { repoAddress, shortSha } from '../lib/format'
import { useRepoPilot } from '../pilot-context'

export function Repositories() {
  const { repos, tasks, addRepo, removeRepo, setCurrentRepoId } = useRepoPilot()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [githubOpen, setGithubOpen] = useState(false)
  const [owner, setOwner] = useState('yourname')
  const [name, setName] = useState('')
  const [branch, setBranch] = useState('main')
  const [commit, setCommit] = useState('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
  const commitOk = /^[0-9a-f]{7,64}$/i.test(commit.trim())

  function close() {
    setOpen(false)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!owner.trim() || !name.trim() || !commitOk) return
    const id = addRepo({
      owner: owner.trim(),
      name: name.trim(),
      defaultBranch: branch.trim() || 'main',
      commit: commit.trim(),
    })
    setName('')
    close()
    navigate(`/repos/${id}`)
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>代码仓库</h1>
          <p>只有允许名单里的 Go 仓库能被检出。索引按每次运行单独建立。</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => setGithubOpen(true)}>
            从 GitHub 添加
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            手动加入
          </button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table repo-table">
          <thead>
            <tr>
              <th>仓库</th>
              <th>语言</th>
              <th>默认分支</th>
              <th>GitHub 安装</th>
              <th>最近运行</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {repos.map((repo) => {
              const latest = tasks.find((task) => task.repoId === repo.id)
              return (
                <tr key={repo.id} onClick={() => navigate(`/repos/${repo.id}`)}>
                  <td>
                    <Link to={`/repos/${repo.id}`} onClick={(event) => event.stopPropagation()}>
                      <strong>{repoAddress(repo.owner, repo.name)}</strong>
                    </Link>
                    {repo.allowed ? null : <div className="hint">不在允许名单，不能检出</div>}
                  </td>
                  <td>{repo.language}</td>
                  <td className="mono">{repo.defaultBranch}</td>
                  <td>
                    <InstallBadge status={repo.installation} />
                  </td>
                  <td onClick={(event) => event.stopPropagation()}>
                    {latest ? <Link to={`/tasks/${latest.id}`}>{latest.id}</Link> : <span className="hint">还没有</span>}
                  </td>
                  <td>
                    <div className="ops" onClick={(event) => event.stopPropagation()}>
                      {repo.allowed ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentRepoId(repo.id)
                            navigate('/tasks/new')
                          }}
                        >
                          新建分析
                        </button>
                      ) : null}
                      <button type="button" className="danger" onClick={() => removeRepo(repo.id)}>
                        移出名单
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {githubOpen ? <GitHubRepoPicker onClose={() => setGithubOpen(false)} /> : null}
      {open ? (
        <Modal title="加入允许名单" onClose={close}>
          <form className="modal-form" onSubmit={submit}>
            <div className="modal-grid">
              <label>
                Owner
                <input value={owner} onChange={(event) => setOwner(event.target.value)} autoComplete="off" />
              </label>
              <label>
                仓库名
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" placeholder="例如 order-service" />
              </label>
              <label>
                默认分支
                <input value={branch} onChange={(event) => setBranch(event.target.value)} autoComplete="off" />
              </label>
              <label>
                语言
                <input value="Go" disabled />
              </label>
              <label className="modal-span">
                Commit
                <input className="mono" value={commit} onChange={(event) => setCommit(event.target.value)} spellCheck={false} />
              </label>
            </div>
            <p className="hint" style={{ margin: 0 }}>
              {commitOk ? `将检出 ${shortSha(commit.trim())}。` : '需要一个 7 到 64 位的 commit。'}
              只接受 Go 仓库。
            </p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={close}>
                取消
              </button>
              <button type="submit" className="btn btn-primary" disabled={!owner.trim() || !name.trim() || !commitOk}>
                加入名单
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  )
}
