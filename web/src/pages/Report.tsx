import { Link, useParams } from 'react-router-dom'
import { DiffView } from '../components/DiffView'
import { kindLabel, shortSha } from '../lib/format'
import { useRepoPilot } from '../pilot-context'

const CLAIM_LABEL = { function: '函数', type: '类型', caller: '调用方', test: '测试' } as const

export function Report() {
  const { taskId = '' } = useParams()
  const { tasks, ingestPullRequest } = useRepoPilot()
  const task = tasks.find((item) => item.id === taskId)

  if (!task) {
    return (
      <div className="page">
        <div className="empty">
          <h1>没有这份报告</h1>
          <Link className="btn" to="/tasks">
            返回记录
          </Link>
        </div>
      </div>
    )
  }

  const published = task.findings.filter((item) => item.published && item.inDiff)
  const dropped = task.findings.filter((item) => !item.inDiff || !item.published)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="kicker">{kindLabel(task.kind)} · {task.id}</p>
          <h1>{task.title}</h1>
          <p>
            {task.owner}/{task.repoName} · {task.branch} · <span className="mono">{shortSha(task.commit)}</span>
          </p>
        </div>
        <Link className="btn" to={`/tasks/${task.id}`}>
          返回运行
        </Link>
      </div>

      <article className="diagnosis" style={{ marginBottom: 16 }}>
        <p>{task.summary}</p>
      </article>

      {task.kind === 'analyze' ? (
        <section className="block">
          <div className="block-head">
            <h2>带行号的结论</h2>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>类别</th>
                  <th>符号</th>
                  <th>结论</th>
                  <th>位置</th>
                </tr>
              </thead>
              <tbody>
                {task.claims.map((claim) => (
                  <tr key={claim.id}>
                    <td>{CLAIM_LABEL[claim.kind]}</td>
                    <td className="mono">{claim.symbol}</td>
                    <td>{claim.text}</td>
                    <td className="mono">
                      {claim.path}:{claim.line}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {task.claims.length === 0 ? <p className="hint pad">报告还没有能对上索引的结论。</p> : null}
        </section>
      ) : (
        <>
          <div className="notice" style={{ marginBottom: 16 }}>
            <div>
              <strong>{task.commentPosted ? '已发表评论型 review' : '还没有发表评论'}</strong>
              <p>只评论。不批准，不合并，不推送。同一 head SHA 再次投递不会再发一条。</p>
            </div>
            <button type="button" className="btn" onClick={() => ingestPullRequest(task.repoId, task.commit)}>
              再次投递这个 SHA
            </button>
          </div>
          {task.diff.map((file) => (
            <DiffView key={file.path} file={file} />
          ))}
          <section className="block" style={{ marginTop: 16 }}>
            <div className="block-head">
              <h2>落在 diff 上的意见</h2>
            </div>
            <FindingTable rows={published} empty="没有已发表的意见。" />
          </section>
          <section className="block" style={{ marginTop: 16 }}>
            <div className="block-head">
              <h2>未发表</h2>
            </div>
            <FindingTable rows={dropped} empty="没有被丢弃的扫描结果。" dropped />
          </section>
        </>
      )}
    </div>
  )
}

function FindingTable({
  rows,
  empty,
  dropped,
}: {
  rows: { id: string; rule: string; path: string; line: number; severity: string; summary: string; evidence: string }[]
  empty: string
  dropped?: boolean
}) {
  if (rows.length === 0) return <p className="hint pad">{empty}</p>
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>规则</th>
            <th>位置</th>
            <th>级别</th>
            <th>说明</th>
            <th>证据</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="mono">{row.rule}</td>
              <td className="mono">
                {row.path}:{row.line}
              </td>
              <td>{row.severity}</td>
              <td>
                {row.summary}
                {dropped ? ' 未发表：行号不在 diff 内。' : ''}
              </td>
              <td className="mono">{row.evidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
