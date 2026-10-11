import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { githubAccess, listOwnedRepositories, readBranchCommit, type RemoteRepository } from '../lib/github'

const emptyRepos: RemoteRepository[] = []
import { useRepoPilot } from '../pilot-context'
import { Modal } from './Modal'

export function GitHubRepoPicker({ onClose }: { onClose: () => void }) {
  const { settings, repos, addRepo, pushToast } = useRepoPilot()
  const [result, setResult] = useState<{ token: string; base: string; items: RemoteRepository[]; error: string } | null>(null)
  const [actionError, setActionError] = useState('')
  const [query, setQuery] = useState('')
  const [pendingId, setPendingId] = useState<number | null>(null)
  const ready = Boolean(settings.githubToken.trim())
  const loading = ready && (result?.token !== settings.githubToken || result?.base !== settings.githubApiBase)
  const items = loading || !result ? emptyRepos : result.items
  const error = actionError || (loading ? '' : (result?.error ?? ''))

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    const token = settings.githubToken
    const base = settings.githubApiBase
    listOwnedRepositories(githubAccess(settings))
      .then((next) => {
        if (!cancelled) setResult({ token, base, items: next, error: '' })
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setResult({
            token,
            base,
            items: [],
            error: reason instanceof Error ? reason.message : '读取 GitHub 仓库失败',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [ready, settings])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items
      .filter((repo) => {
        if (!needle) return true
        return `${repo.owner}/${repo.name} ${repo.description}`.toLowerCase().includes(needle)
      })
      .sort((a, b) => Number(b.language === 'Go') - Number(a.language === 'Go') || a.name.localeCompare(b.name))
  }, [items, query])

  async function add(repo: RemoteRepository) {
    setPendingId(repo.id)
    setActionError('')
    try {
      const commit = await readBranchCommit(githubAccess(settings), repo.owner, repo.name, repo.defaultBranch)
      addRepo({
        owner: repo.owner,
        name: repo.name,
        defaultBranch: repo.defaultBranch,
        commit,
      })
      pushToast(`已加入 ${repo.owner}/${repo.name}`, 'ok')
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : '加入仓库失败')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Modal title="从 GitHub 添加" onClose={onClose} wide>
      {ready ? (
        <div className="gh-picker">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索仓库名" autoComplete="off" />
          {loading ? <p className="hint">正在读取你拥有的仓库…</p> : null}
          {error ? <p className="field-error">{error}</p> : null}
          {!loading && items.length === 0 && !error ? <p className="hint">这个账号下没有拥有的仓库。</p> : null}
          {visible.length > 0 ? (
            <div className="gh-list">
              {visible.map((repo) => {
                const added = repos.some((item) => item.owner === repo.owner && item.name === repo.name)
                const go = repo.language === 'Go'
                return (
                  <div className="gh-row" key={repo.id}>
                    <div>
                      <strong>
                        {repo.owner}/{repo.name}
                      </strong>
                      <span>
                        {repo.language || '未识别语言'}
                        {repo.private ? ' · 私有' : ''}
                        {repo.description ? ` · ${repo.description}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn"
                      disabled={!go || added || pendingId === repo.id}
                      onClick={() => void add(repo)}
                    >
                      {added ? '已在名单' : pendingId === repo.id ? '加入中' : go ? '加入' : '仅 Go'}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : null}
          {!loading && items.length > 0 && visible.length === 0 ? <p className="hint">没有匹配的仓库。</p> : null}
        </div>
      ) : (
        <p className="hint gh-empty">
          先在设置里填写 GitHub 访问令牌。<Link to="/settings">打开设置</Link>
        </p>
      )}
    </Modal>
  )
}
