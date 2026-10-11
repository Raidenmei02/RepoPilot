import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CodeBlock } from '../components/CodeBlock'
import { ConnectionPill, StatusBadge, StepGlyph } from '../components/StatusBadge'
import { clock, formatDuration, kindLabel, shortSha } from '../lib/format'
import { useRepoPilot } from '../pilot-context'
import type { RunStatus, StepId } from '../types'

const LIVE: RunStatus[] = ['queued', 'preparing', 'indexing', 'analyzing', 'scanning', 'reviewing']
const FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'tool', label: '只读工具' },
  { id: 'scanner', label: '扫描器' },
  { id: 'decision', label: '判断' },
  { id: 'error', label: '错误' },
] as const

export function TaskDetail() {
  const { taskId = '' } = useParams()
  const { tasks, cancelTask, retryTask, reconnectTask } = useRepoPilot()
  const task = tasks.find((item) => item.id === taskId)
  const [pinned, setPinned] = useState<StepId | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const [openEvent, setOpenEvent] = useState<string | null>(null)
  const [openFile, setOpenFile] = useState<string | null>(null)

  if (!task) {
    return (
      <div className="page">
        <div className="empty">
          <h1>找不到这次运行</h1>
          <p>run_id 不在当前会话里。</p>
          <Link className="btn" to="/tasks">
            返回记录
          </Link>
        </div>
      </div>
    )
  }

  const running = task.steps.find((step) => step.status === 'running')
  const latestStep = [...task.steps].reverse().find((step) => step.status !== 'pending' && step.status !== 'skipped')
  const activeStep = pinned ?? running?.id ?? latestStep?.id ?? task.steps[0]?.id
  const stepEvents = task.events.filter((event) => event.stepId === activeStep && (filter === 'all' || event.kind === filter))
  const ready = task.status === 'completed' || task.status === 'commented'

  return (
    <div className="run">
      <header className="run-bar">
        <div>
          <h1>{task.title}</h1>
          <p>
            <span className="mono">{task.id}</span>
            <span>{kindLabel(task.kind)}</span>
            <span className="mono">
              {task.owner}/{task.repoName}
            </span>
            <span className="mono">{task.branch}</span>
            <span className="mono" title={task.commit}>
              {shortSha(task.commit)}
            </span>
            <StatusBadge status={task.status} />
            <ConnectionPill state={task.connection} />
          </p>
        </div>
        <div className="run-actions">
          {ready ? (
            <Link className="btn btn-primary" to={`/tasks/${task.id}/report`}>
              查看报告
            </Link>
          ) : null}
          <button type="button" className="btn" onClick={() => reconnectTask(task.id)}>
            重新连接
          </button>
          <button type="button" className="btn" disabled={task.status !== 'failed'} onClick={() => retryTask(task.id)}>
            重试失败步骤
          </button>
          <button type="button" className="btn btn-danger" disabled={!LIVE.includes(task.status)} onClick={() => cancelTask(task.id)}>
            取消
          </button>
        </div>
      </header>
      {task.connection === 'disconnected' ? (
        <div className="notice notice-bad run-notice">
          <div>
            <strong>事件流中断</strong>
            <p>数据库里的步骤还在。重新连接不会重做已经完成的检出和索引。</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => reconnectTask(task.id)}>
            按 run_id 继续
          </button>
        </div>
      ) : null}
      {task.errorSummary ? (
        <div className="notice notice-bad run-notice">
          <div>
            <strong>这次运行失败了</strong>
            <p>{task.errorSummary}</p>
          </div>
          <button type="button" className="btn" onClick={() => retryTask(task.id)}>
            从失败步骤继续
          </button>
        </div>
      ) : null}
      <div className="run-grid">
        <aside className="steps">
          <div className="pane-label">步骤</div>
          {task.steps.map((step) => (
            <button
              key={step.id}
              type="button"
              className={`step${activeStep === step.id ? ' is-on' : ''}`}
              onClick={() => setPinned(step.id)}
            >
              <StepGlyph status={step.status} />
              <span>
                <strong>{step.label}</strong>
                <em>{step.detail}</em>
              </span>
              <small>{step.durationMs ? formatDuration(step.durationMs) : ''}</small>
            </button>
          ))}
          {pinned ? (
            <button type="button" className="btn btn-ghost follow" onClick={() => setPinned(null)}>
              跟随当前步骤
            </button>
          ) : null}
        </aside>
        <section className="activity">
          <article className="diagnosis">
            <div className="pane-label">{task.kind === 'analyze' ? '分析进展' : '审核进展'}</div>
            <p>{task.summary || '还没有结论。'}</p>
            {task.kind === 'analyze' && task.question ? <p className="hint">问题：{task.question}</p> : null}
          </article>
          <div className="pane-label">事件</div>
          <div className="filters" style={{ display: 'flex', gap: 8, padding: '0 12px 8px' }}>
            {FILTERS.map((item) => (
              <button key={item.id} type="button" className={`btn btn-ghost${filter === item.id ? ' is-on' : ''}`} onClick={() => setFilter(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          {stepEvents.length === 0 ? <p className="hint pad">这一步还没有事件。</p> : null}
          {stepEvents.map((event) => {
            const open = openEvent === event.id
            return (
              <article key={event.id} className={`event-card kind-${event.kind}`}>
                <button type="button" className="event-toggle" onClick={() => setOpenEvent(open ? null : event.id)}>
                  <span className="mono">{event.name}</span>
                  <span>{event.summary}</span>
                  <small>{clock(event.at)}</small>
                </button>
                {open ? (
                  <div className="event-body">
                    <p className="hint">工具参数和输出都来自这次运行。模型不能改扫描命令。</p>
                    {event.input ? (
                      <>
                        <div className="log-label">输入</div>
                        <pre>{event.input}</pre>
                      </>
                    ) : null}
                    {event.output ? (
                      <>
                        <div className="log-label">输出</div>
                        <pre>{event.output}</pre>
                      </>
                    ) : null}
                    {event.error ? (
                      <>
                        <div className="log-label">错误</div>
                        <pre className="is-error">{event.error}</pre>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </article>
            )
          })}
        </section>
        <aside className="context">
          <div className="pane-label">证据与预算</div>
          <p className="hint pad">
            工具 {task.budget.toolCalls}/{task.budget.toolLimit}，模型调用 {task.budget.modelCalls}
          </p>
          <p className="hint pad">
            {task.model} · {task.promptVersion} · {task.retrieval}
          </p>
          {task.claims.map((claim) => (
            <p key={claim.id} className="hint pad">
              <span className="mono">
                {claim.path}:{claim.line}
              </span>{' '}
              {claim.symbol}
            </p>
          ))}
          {task.findings.map((finding) => (
            <p key={finding.id} className="hint pad">
              <span className="mono">
                {finding.rule} {finding.path}:{finding.line}
              </span>{' '}
              {finding.inDiff ? '在 diff 内' : '不在 diff 内'}
            </p>
          ))}
          {task.files.map((file) => (
            <article key={file.id} className="file-card">
              <button type="button" className="event-toggle" onClick={() => setOpenFile(openFile === file.id ? null : file.id)}>
                <span className="mono">
                  {file.path}:{file.startLine}
                </span>
                <span>{file.symbol}</span>
              </button>
              {openFile === file.id ? <CodeBlock content={file.content} startLine={file.startLine} /> : null}
            </article>
          ))}
        </aside>
      </div>
    </div>
  )
}
