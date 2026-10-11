import { statusLabel } from '../lib/format'
import type { ConnectionState, InstallStatus, StepStatus, RunStatus } from '../types'

export function StatusBadge({ status }: { status: RunStatus }) {
  return <span className={`badge badge-${status}`}>{statusLabel(status)}</span>
}

export function InstallBadge({ status }: { status: InstallStatus }) {
  const label = status === 'connected' ? '已安装' : '未安装'
  return <span className={`badge ${status === 'connected' ? 'badge-completed' : 'badge-failed'}`}>{label}</span>
}

export function ConnectionPill({ state }: { state: ConnectionState }) {
  const label = { connected: '事件流已连接', reconnecting: '重新连接中', disconnected: '连接中断' }[state]
  return (
    <span className={`conn conn-${state}`}>
      <i />
      {label}
    </span>
  )
}

export function StepGlyph({ status }: { status: StepStatus }) {
  if (status === 'running') return <span className="spin" />
  if (status === 'completed') return <span className="glyph ok">✓</span>
  if (status === 'failed') return <span className="glyph bad">!</span>
  if (status === 'cancelled') return <span className="glyph mute">–</span>
  if (status === 'skipped') return <span className="glyph mute">–</span>
  return <span className="glyph wait" />
}
