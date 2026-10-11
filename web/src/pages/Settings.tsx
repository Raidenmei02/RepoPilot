import { useState } from 'react'
import { githubApiBaseError, verifyGitHubAccess } from '../lib/github'
import { READONLY_TOOLS, SCANNERS } from '../model'
import { useRepoPilot } from '../pilot-context'
import { useTheme } from '../theme-state'

export function Settings() {
  const { settings, updateSettings } = useRepoPilot()
  const { theme, setTheme } = useTheme()
  const [draft, setDraft] = useState(settings)
  const [probe, setProbe] = useState('')
  const [probing, setProbing] = useState(false)
  const baseError = githubApiBaseError(draft.githubApiBase)
  const dirty =
    draft.provider !== settings.provider ||
    draft.model !== settings.model ||
    draft.promptVersion !== settings.promptVersion ||
    draft.retrieval !== settings.retrieval ||
    draft.toolLimit !== settings.toolLimit ||
    draft.timeoutMin !== settings.timeoutMin ||
    draft.githubToken !== settings.githubToken ||
    draft.githubApiBase !== settings.githubApiBase

  async function testGitHub() {
    setProbing(true)
    setProbe('')
    try {
      const login = await verifyGitHubAccess(draft)
      setProbe(`已连接到 ${login}`)
    } catch (error) {
      setProbe(error instanceof Error ? error.message : '无法连接 GitHub')
    } finally {
      setProbing(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>设置</h1>
          <p>模型名字、预算和 GitHub 访问参数保存在这台浏览器。模型密钥从环境变量读取。</p>
        </div>
        <button type="button" className="btn btn-primary" disabled={!dirty || Boolean(baseError)} onClick={() => updateSettings(draft)}>
          保存
        </button>
      </div>

      <div className="set-layout">
          <section className="set-card">
            <header>
              <h2>模型</h2>
              <p>分析报告会记下模型名、提示词版本和检索方式。</p>
            </header>
            <div className="set-fields">
              <label>
                接口
                <input value={draft.provider} onChange={(event) => setDraft({ ...draft, provider: event.target.value })} />
              </label>
              <label>
                模型名
                <input className="mono" value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} />
              </label>
              <label>
                提示词版本
                <input className="mono" value={draft.promptVersion} onChange={(event) => setDraft({ ...draft, promptVersion: event.target.value })} />
              </label>
              <label>
                检索
                <select value={draft.retrieval} onChange={(event) => setDraft({ ...draft, retrieval: event.target.value })}>
                  <option value="go-ast">go-ast</option>
                  <option value="text">text</option>
                </select>
              </label>
              <label>
                只读工具次数上限
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={draft.toolLimit}
                  onChange={(event) => setDraft({ ...draft, toolLimit: Number(event.target.value) })}
                />
              </label>
              <label>
                单次时间预算（分钟）
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={draft.timeoutMin}
                  onChange={(event) => setDraft({ ...draft, timeoutMin: Number(event.target.value) })}
                />
              </label>
            </div>
          </section>

          <section className="set-card">
            <header>
              <h2>GitHub</h2>
              <p>用个人访问令牌读取你拥有的仓库。保存后，代码仓库页经本机开发服务向 GitHub 读取。</p>
            </header>
            <div className="set-fields">
              <label className="set-span">
                访问令牌
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={draft.githubToken}
                  placeholder="github_pat_ 或 ghp_"
                  onChange={(event) => {
                    setProbe('')
                    setDraft({ ...draft, githubToken: event.target.value })
                  }}
                />
                <a className="token-link" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
                  去 GitHub 创建令牌
                </a>
              </label>
              <label className="set-span">
                API 地址
                <input
                  className="mono"
                  value={draft.githubApiBase}
                  spellCheck={false}
                  onChange={(event) => {
                    setProbe('')
                    setDraft({ ...draft, githubApiBase: event.target.value })
                  }}
                />
              </label>
            </div>
            {baseError ? <p className="field-error set-github-note">{baseError}</p> : null}
            <div className="set-github-actions">
              <button type="button" className="btn" disabled={!draft.githubToken.trim() || Boolean(baseError) || probing} onClick={() => void testGitHub()}>
                {probing ? '正在连接' : '测试连接'}
              </button>
              {probe ? <span className="hint">{probe}</span> : <span className="hint">令牌需要仓库的只读权限，Fine-grained 令牌勾选 Contents: Read。</span>}
            </div>
          </section>

          <section className="set-card">
            <header>
              <h2>外观</h2>
              <p>代码、diff 和日志在两种外观里都保持深色。</p>
            </header>
            <div className="set-themes">
              <button type="button" className={`theme-card${theme === 'day' ? ' is-on' : ''}`} onClick={() => setTheme('day')}>
                <Swatch mode="day" />
                <span>
                  <strong>日间</strong>
                  <em>浅色工作台</em>
                </span>
              </button>
              <button type="button" className={`theme-card${theme === 'night' ? ' is-on' : ''}`} onClick={() => setTheme('night')}>
                <Swatch mode="night" />
                <span>
                  <strong>夜间</strong>
                  <em>深色工作台</em>
                </span>
              </button>
            </div>
          </section>

          <section className="set-card">
            <header>
              <h2>只读工具</h2>
              <p>第一版固定开启，模型不能换成别的工具。</p>
            </header>
            {READONLY_TOOLS.map((tool) => (
              <div className="set-row" key={tool.id}>
                <strong>{tool.label}</strong>
                <span>{tool.detail}</span>
                <em className="set-badge">固定</em>
              </div>
            ))}
          </section>

          <section className="set-card">
            <header>
              <h2>以后的接口</h2>
            </header>
            <div className="set-reserved">
              <div>
                <strong>修复任务</strong>
                <p>不在这六周里。以后只在创建任务时扩展 kind。</p>
              </div>
              <code>未开放</code>
            </div>
          </section>

      <section className="set-card">
        <header>
          <h2>固定扫描器</h2>
        </header>
        <p className="set-note">命令和参数不能改。容器无网络，不挂 Docker socket，不传入 API Key 或 SSH 密钥。</p>
        <div className="set-scans">
          {SCANNERS.map((scanner) => (
            <div className="scan-chip" key={scanner.id}>
              <span>{scanner.label}</span>
              <code>{scanner.command}</code>
            </div>
          ))}
        </div>
      </section>
      </div>
    </div>
  )
}

function Swatch({ mode }: { mode: 'day' | 'night' }) {
  return (
    <span className={`swatch swatch-${mode}`} aria-hidden="true">
      <span className="rail" />
      <span className="pane">
        <i />
        <i style={{ width: '70%' }} />
        <b />
      </span>
    </span>
  )
}
