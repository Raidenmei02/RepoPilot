import type { AgentEvent, RunKind, RunStatus, Step, StepId, StepStatus, Task } from './types'

export interface EventDraft extends Omit<AgentEvent, 'id' | 'taskId' | 'at'> {
  key?: string
}

export type SimAction =
  | { delay: number; type: 'step'; stepId: StepId; status: StepStatus; detail: string }
  | { delay: number; type: 'event'; event: EventDraft }
  | { delay: number; type: 'file'; file: Task['files'][number] }
  | { delay: number; type: 'claim'; claim: Task['claims'][number] }
  | { delay: number; type: 'finding'; finding: Task['findings'][number] }
  | { delay: number; type: 'diff'; files: Task['diff'] }
  | { delay: number; type: 'summary'; text: string }
  | { delay: number; type: 'budget'; toolCalls?: number; modelCalls?: number }
  | { delay: number; type: 'status'; status: RunStatus; errorSummary?: string; failedStepId?: StepId; commentPosted?: boolean }
  | { delay: number; type: 'connection'; state: Task['connection'] }

const ANALYZE_STEPS: StepId[] = ['validate', 'prepare', 'index', 'analyze', 'report']
const REVIEW_STEPS: StepId[] = ['validate', 'prepare', 'index', 'scan', 'review', 'comment']

const STEP_LABELS: Record<StepId, string> = {
  validate: '校验输入',
  prepare: '检出 commit',
  index: '建立索引',
  analyze: '只读分析',
  report: '生成报告',
  scan: '固定扫描',
  review: '组织评论',
  comment: '发表评论',
}

const STATUS_WHEN_RUNNING: Partial<Record<StepId, RunStatus>> = {
  validate: 'preparing',
  prepare: 'preparing',
  index: 'indexing',
  analyze: 'analyzing',
  report: 'analyzing',
  scan: 'scanning',
  review: 'reviewing',
  comment: 'reviewing',
}

export const READONLY_TOOLS = [
  { id: 'list_repo_files', label: 'list_repo_files', detail: '列出工作区内的文件' },
  { id: 'search_code', label: 'search_code', detail: '在索引和文本里检索' },
  { id: 'get_symbol', label: 'get_symbol', detail: '按名字读取函数或类型' },
  { id: 'find_references', label: 'find_references', detail: '查找调用方' },
  { id: 'read_file_range', label: 'read_file_range', detail: '读取文件中的一段行' },
] as const

export const SCANNERS = [
  { id: 'go_vet', label: 'go vet', command: 'go vet ./...' },
  { id: 'staticcheck', label: 'staticcheck', command: 'staticcheck ./...' },
  { id: 'gosec', label: 'gosec', command: 'gosec ./...' },
  { id: 'govulncheck', label: 'govulncheck', command: 'govulncheck ./...' },
] as const

export function makeSteps(kind: RunKind): Step[] {
  const ids = kind === 'analyze' ? ANALYZE_STEPS : REVIEW_STEPS
  return ids.map((id) => ({
    id,
    label: STEP_LABELS[id],
    status: 'pending' as const,
    detail: '等待开始',
  }))
}

export function withStep(task: Task, stepId: StepId, status: StepStatus, detail: string, now: string): Task {
  const terminal = task.status === 'completed' || task.status === 'commented' || task.status === 'failed' || task.status === 'cancelled'
  const nextStatus = status === 'running' && !terminal ? STATUS_WHEN_RUNNING[stepId] ?? task.status : task.status
  return {
    ...task,
    updatedAt: now,
    status: nextStatus,
    failedStepId: status === 'failed' ? stepId : task.failedStepId,
    steps: task.steps.map((step) => {
      if (step.id !== stepId) return step
      const next: Step = { ...step, status, detail }
      if (status === 'running') next.startedAt = step.startedAt ?? now
      if (status === 'completed' || status === 'failed' || status === 'skipped' || status === 'cancelled') {
        next.finishedAt = now
        if (next.startedAt) next.durationMs = Math.max(0, new Date(now).getTime() - new Date(next.startedAt).getTime())
      }
      return next
    }),
  }
}

export function upsertEvent(task: Task, draft: EventDraft, now: string): Task {
  const existing = draft.key ? task.events.find((event) => event.key === draft.key) : undefined
  if (existing) {
    return {
      ...task,
      updatedAt: now,
      events: task.events.map((event) =>
        event.key === draft.key ? { ...event, ...draft, id: event.id, taskId: task.id, at: event.at } : event,
      ),
    }
  }
  const eventSeq = task.eventSeq + 1
  const event: AgentEvent = { ...draft, id: draft.key ?? `${task.id}-e${eventSeq}`, taskId: task.id, at: now }
  return { ...task, eventSeq, updatedAt: now, events: [...task.events, event] }
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((entry) => entry.id === item.id)
  if (index === -1) return [...list, item]
  const copy = list.slice()
  copy[index] = item
  return copy
}

export function applyAction(task: Task, action: SimAction, now = new Date().toISOString()): Task {
  if (task.status === 'cancelled') return task
  switch (action.type) {
    case 'step':
      return withStep(task, action.stepId, action.status, action.detail, now)
    case 'event':
      return upsertEvent(task, action.event, now)
    case 'file':
      return { ...task, updatedAt: now, files: upsert(task.files, action.file) }
    case 'claim':
      return { ...task, updatedAt: now, claims: upsert(task.claims, action.claim) }
    case 'finding':
      return { ...task, updatedAt: now, findings: upsert(task.findings, action.finding) }
    case 'diff':
      return { ...task, updatedAt: now, diff: action.files }
    case 'summary':
      return { ...task, updatedAt: now, summary: action.text }
    case 'budget':
      return {
        ...task,
        updatedAt: now,
        budget: {
          ...task.budget,
          toolCalls: action.toolCalls ?? task.budget.toolCalls,
          modelCalls: action.modelCalls ?? task.budget.modelCalls,
        },
      }
    case 'connection':
      return { ...task, updatedAt: now, connection: action.state }
    case 'status':
      return {
        ...task,
        updatedAt: now,
        status: action.status,
        errorSummary: action.errorSummary,
        commentPosted: action.commentPosted ?? task.commentPosted,
        failedStepId: action.status === 'failed' ? action.failedStepId ?? task.failedStepId : undefined,
      }
  }
}
