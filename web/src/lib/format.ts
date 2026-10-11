import type { DiffFile, RunKind, RunStatus } from '../types'

export function hoursAgo(hours: number, minutes = 0): string {
  return new Date(Date.now() - (hours * 60 + minutes) * 60_000).toISOString()
}

export function formatWhen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.round(hours / 24)
  return `${days} 天前`
}

export function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-CN', { hour12: false })
}

export function formatDuration(ms?: number): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function shortSha(sha: string): string {
  return sha.slice(0, 7)
}

export function kindLabel(kind: RunKind): string {
  return kind === 'analyze' ? '项目分析' : 'PR 审核'
}

export function statusLabel(status: RunStatus): string {
  switch (status) {
    case 'queued':
      return '等待中'
    case 'preparing':
      return '准备中'
    case 'indexing':
      return '索引中'
    case 'analyzing':
      return '分析中'
    case 'scanning':
      return '扫描中'
    case 'reviewing':
      return '组织评论'
    case 'completed':
      return '已完成'
    case 'commented':
      return '已评论'
    case 'failed':
      return '失败'
    case 'cancelled':
      return '已取消'
  }
}

export function repoAddress(owner: string, name: string): string {
  return `github.com/${owner}/${name}`
}

export function parseRepoAddress(raw: string): { owner: string; name: string } | null {
  const text = raw
    .trim()
    .replace(/\.git$/, '')
    .replace(/^https?:\/\//, '')
    .replace(/^git@github\.com:/, '')
  const matched = text.match(/^(?:github\.com\/)?([^/\s]+)\/([^/\s]+)$/)
  if (!matched) return null
  return { owner: matched[1], name: matched[2] }
}

export function titleFromProblem(problem: string): string {
  const line = problem.trim().split(/[。\n]/)[0]?.trim() || '未命名任务'
  return line.length > 28 ? `${line.slice(0, 28)}…` : line
}

export function diffCount(file: DiffFile): { additions: number; deletions: number } {
  return {
    additions: file.lines.filter((line) => line.kind === 'add').length,
    deletions: file.lines.filter((line) => line.kind === 'del').length,
  }
}

export function greeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 5) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function compactNumber(value: number): string {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`
  return String(value)
}
