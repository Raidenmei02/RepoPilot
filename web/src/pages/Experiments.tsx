import { useState } from 'react'
import { percent } from '../lib/format'
import { useRepoPilot } from '../pilot-context'
import type { ExperimentCase } from '../types'

const DATASETS = ['order-fixture']
const MODELS = ['gpt-4.1', 'gpt-4.1-mini']
const PROMPTS = ['analyze-v1', 'analyze-v0', 'review-v1']
const RETRIEVALS = ['go-ast', 'text']

export function Experiments() {
  const { experiments, saveExperiment } = useRepoPilot()
  const [dataset, setDataset] = useState(DATASETS[0])
  const [model, setModel] = useState(MODELS[0])
  const [prompt, setPrompt] = useState(PROMPTS[0])
  const [retrieval, setRetrieval] = useState(RETRIEVALS[0])
  const [open, setOpen] = useState<ExperimentCase | null>(null)
  const match = experiments.find((item) => item.dataset === dataset && item.model === model && item.prompt === prompt && item.retrieval === retrieval)
  const metrics = match?.metrics

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>评测实验</h1>
          <p>只展示已经跑出来的数：符号是否命中、意见是否落在变更行、扫描发现是否被保留、耗时和模型调用次数。</p>
        </div>
      </div>
      <div className="history-filters">
        <label>
          数据集
          <select value={dataset} onChange={(event) => setDataset(event.target.value)}>
            {DATASETS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          模型
          <select value={model} onChange={(event) => setModel(event.target.value)}>
            {MODELS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          提示词
          <select value={prompt} onChange={(event) => setPrompt(event.target.value)}>
            {PROMPTS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          检索
          <select value={retrieval} onChange={(event) => setRetrieval(event.target.value)}>
            {RETRIEVALS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn" onClick={() => saveExperiment({ name: `${retrieval}-${prompt}`, dataset, model, prompt, retrieval })}>
          保存配置
        </button>
      </div>
      <section className="metrics metrics-5" aria-label="已跑出的指标">
        <Metric label="符号命中" value={metrics ? percent(metrics.symbolHit) : '—'} hint="结论能在索引里查到" />
        <Metric label="意见落在变更行" value={metrics ? percent(metrics.commentOnDiff) : '—'} hint="行号属于本次 diff" />
        <Metric label="扫描发现保留" value={metrics ? percent(metrics.findingKept) : '—'} hint="工具结果被写进评论" />
        <Metric label="平均耗时" value={metrics ? `${metrics.avgSeconds}s` : '—'} hint="单次运行" />
        <Metric label="模型调用" value={metrics ? String(metrics.modelCalls) : '—'} hint="不含扫描器" />
      </section>
      <section className="block" style={{ marginTop: 16 }}>
        <div className="block-head">
          <h2>{match ? match.name : '这个组合还没有结果'}</h2>
        </div>
        {(match?.cases.length ?? 0) === 0 ? <p className="hint pad">保存配置不会发明指标。跑完之后才出现数字和失败样本。</p> : null}
        <div className="table-wrap">
          <table className="table">
            <tbody>
              {match?.cases.map((item) => (
                <tr key={item.id} onClick={() => setOpen(item)}>
                  <td>
                    <strong>{item.title}</strong>
                    <div className="hint">{item.repo}</div>
                  </td>
                  <td>{outcomeLabel(item.outcome)}</td>
                  <td>{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {open ? (
        <div className="drawer-backdrop" onClick={() => setOpen(null)}>
          <aside className="drawer" onClick={(event) => event.stopPropagation()}>
            <header>
              <strong>{open.title}</strong>
              <button type="button" className="btn" onClick={() => setOpen(null)}>
                关闭
              </button>
            </header>
            <p className="hint">{open.reason}</p>
            {open.trace.map((step) => (
              <article key={step.name} className="event-card">
                <div className="event-toggle">
                  <span className="mono">{step.name}</span>
                  <span>{step.summary}</span>
                </div>
                <div className="event-body">
                  <pre>{step.input}</pre>
                  <pre>{step.output}</pre>
                </div>
              </article>
            ))}
          </aside>
        </div>
      ) : null}
    </div>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong className="metric-text">{value}</strong>
      <em>{hint}</em>
    </div>
  )
}

function outcomeLabel(outcome: ExperimentCase['outcome']): string {
  switch (outcome) {
    case 'hit':
      return '命中'
    case 'missed':
      return '未命中'
    case 'dropped':
      return '已丢弃'
    case 'kept':
      return '已保留'
  }
}
