export type RunKind = 'analyze' | 'review'

export type RunStatus =
  | 'queued'
  | 'preparing'
  | 'indexing'
  | 'analyzing'
  | 'scanning'
  | 'reviewing'
  | 'completed'
  | 'commented'
  | 'failed'
  | 'cancelled'

export type StepId = 'validate' | 'prepare' | 'index' | 'analyze' | 'report' | 'scan' | 'review' | 'comment'

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled'

export type EventKind = 'tool' | 'scanner' | 'error' | 'decision' | 'status'

export type ToolId = 'list_repo_files' | 'search_code' | 'get_symbol' | 'find_references' | 'read_file_range'

export type ScannerId = 'go_vet' | 'staticcheck' | 'gosec' | 'govulncheck'

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected'

export interface Step {
  id: StepId
  label: string
  status: StepStatus
  detail: string
  startedAt?: string
  finishedAt?: string
  durationMs?: number
}

export interface AgentEvent {
  id: string
  key?: string
  taskId: string
  stepId: StepId
  kind: EventKind
  name: string
  summary: string
  status: 'running' | 'completed' | 'failed'
  input?: string
  output?: string
  error?: string
  at: string
  durationMs?: number
}

export interface CodeRef {
  id: string
  path: string
  language: string
  symbol: string
  reason: string
  confidence: 'high' | 'low'
  startLine: number
  content: string
}

export interface ReportClaim {
  id: string
  kind: 'function' | 'type' | 'caller' | 'test'
  symbol: string
  text: string
  path: string
  line: number
}

export interface Finding {
  id: string
  path: string
  line: number
  rule: string
  severity: 'info' | 'warning' | 'error'
  summary: string
  evidence: string
  inDiff: boolean
  published: boolean
}

export interface DiffLine {
  kind: 'ctx' | 'add' | 'del'
  oldNo?: number
  newNo?: number
  text: string
}

export interface DiffFile {
  path: string
  reason: string
  lines: DiffLine[]
}

export interface PullRequestRef {
  number: number
  title: string
  baseRef: string
  headRef: string
  baseSha: string
  headSha: string
}

export interface Budget {
  toolCalls: number
  toolLimit: number
  modelCalls: number
}

export interface Task {
  id: string
  kind: RunKind
  title: string
  repoId: string
  repoName: string
  owner: string
  language: 'Go'
  branch: string
  commit: string
  status: RunStatus
  connection: ConnectionState
  question: string
  pr?: PullRequestRef
  createdAt: string
  updatedAt: string
  eventSeq: number
  steps: Step[]
  events: AgentEvent[]
  files: CodeRef[]
  claims: ReportClaim[]
  findings: Finding[]
  diff: DiffFile[]
  summary: string
  model: string
  promptVersion: string
  retrieval: string
  budget: Budget
  errorSummary?: string
  failedStepId?: StepId
  commentPosted: boolean
}

export type InstallStatus = 'connected' | 'missing'

export interface RepoBranch {
  name: string
  commit: string
}

export interface Repo {
  id: string
  owner: string
  name: string
  language: 'Go'
  defaultBranch: string
  branches: RepoBranch[]
  installation: InstallStatus
  allowed: boolean
}

export interface Settings {
  provider: string
  model: string
  promptVersion: string
  retrieval: string
  toolLimit: number
  timeoutMin: number
  githubToken: string
  githubApiBase: string
}

export interface ExperimentTrace {
  name: string
  summary: string
  input: string
  output: string
  error?: string
}

export interface ExperimentCase {
  id: string
  title: string
  repo: string
  outcome: 'hit' | 'missed' | 'dropped' | 'kept'
  reason: string
  trace: ExperimentTrace[]
}

export interface ExperimentMetrics {
  symbolHit: number
  commentOnDiff: number
  findingKept: number
  avgSeconds: number
  modelCalls: number
}

export interface Experiment {
  id: string
  name: string
  dataset: string
  model: string
  prompt: string
  retrieval: string
  savedAt: string
  metrics?: ExperimentMetrics
  cases: ExperimentCase[]
}

export interface AnalyzeInput {
  repoId: string
  branch: string
  commit: string
  question: string
}

export interface ExperimentDraft {
  name: string
  dataset: string
  model: string
  prompt: string
  retrieval: string
}

export type ToastTone = 'ok' | 'err' | 'info'

export interface ToastMessage {
  id: string
  text: string
  tone: ToastTone
}
