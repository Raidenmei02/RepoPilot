import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { sampleQuestion } from '../data'
import { READONLY_TOOLS } from '../model'
import { repoAddress, shortSha } from '../lib/format'
import { useRepoPilot } from '../pilot-context'

export function NewTask() {
  const { repos, currentRepoId, settings, createAnalyze } = useRepoPilot()
  const navigate = useNavigate()
  const allowed = repos.filter((repo) => repo.allowed)
  const initial = allowed.find((repo) => repo.id === currentRepoId) ?? allowed[0]
  const [repoId, setRepoId] = useState(initial?.id ?? '')
  const repo = allowed.find((item) => item.id === repoId) ?? allowed[0]
  const [branch, setBranch] = useState(repo?.branches[0]?.name ?? 'main')
  const branchRef = repo?.branches.find((item) => item.name === branch) ?? repo?.branches[0]
  const [commit, setCommit] = useState(branchRef?.commit ?? '')
  const [question, setQuestion] = useState(sampleQuestion)
  const [error, setError] = useState('')

  function onRepo(nextId: string) {
    const next = allowed.find((item) => item.id === nextId)
    setRepoId(nextId)
    const first = next?.branches[0]
    setBranch(first?.name ?? 'main')
    setCommit(first?.commit ?? '')
  }

  function onBranch(name: string) {
    setBranch(name)
    const found = repo?.branches.find((item) => item.name === name)
    if (found) setCommit(found.commit)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!repo) {
      setError('允许名单里还没有仓库。')
      return
    }
    if (!question.trim()) {
      setError('问题不能为空。')
      return
    }
    if (!/^[0-9a-f]{7,64}$/i.test(commit.trim())) {
      setError('需要一个可以解析的 commit。')
      return
    }
    const id = createAnalyze({ repoId: repo.id, branch, commit: commit.trim(), question: question.trim() })
    if (id) navigate(`/tasks/${id}`)
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>新建分析</h1>
          <p>针对一个问题，返回相关函数、类型、调用方和测试位置。每一条结论都要能点回文件和行号。</p>
        </div>
      </div>
      <form className="form-layout" onSubmit={submit}>
        <div className="form">
          <section>
            <h2>仓库与问题</h2>
            <label>
              允许名单中的仓库
              <select value={repo?.id ?? ''} onChange={(event) => onRepo(event.target.value)}>
                {allowed.map((item) => (
                  <option key={item.id} value={item.id}>
                    {repoAddress(item.owner, item.name)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              分支
              <select value={branch} onChange={(event) => onBranch(event.target.value)}>
                {repo?.branches.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              固定 commit
              <input value={commit} onChange={(event) => setCommit(event.target.value)} spellCheck={false} className="mono" />
            </label>
            <label>
              问题
              <textarea rows={5} value={question} onChange={(event) => setQuestion(event.target.value)} />
            </label>
            {error ? <p className="hint is-error">{error}</p> : null}
            <button type="submit" className="btn btn-primary" disabled={!repo}>
              开始分析
            </button>
          </section>
        </div>
        <aside className="summary">
          <h2>这次运行会做什么</h2>
          <ul className="plain">
            <li>检出 {commit ? shortSha(commit) : '指定 commit'}，忽略仓库 hook。</li>
            <li>只用这次运行的 Go AST 索引。</li>
            <li>模型只能调用 {settings.toolLimit} 次只读工具。</li>
            <li>不生成补丁，不跑测试，不执行任意命令。</li>
          </ul>
          <h3>只读工具</h3>
          <ul className="plain">
            {READONLY_TOOLS.map((tool) => (
              <li key={tool.id}>
                <span className="mono">{tool.label}</span>
                <span> {tool.detail}</span>
              </li>
            ))}
          </ul>
        </aside>
      </form>
    </div>
  )
}
