import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createSeedTasks, experiments as seedExperiments, nextReviewHead, repos as seedRepos } from './data'
import { loadRepos, loadSettings, saveRepos, saveSettings } from './persist'
import { planAnalyze, planContinuation, planReview } from './demoWorker'
import { titleFromProblem } from './lib/format'
import { applyAction, makeSteps, type SimAction } from './model'
import { PilotContext, type PilotApi, type RepoInput } from './pilot-context'
import type { AnalyzeInput, Experiment, ExperimentDraft, Repo, Settings, StepId, Task, ToastMessage, ToastTone } from './types'

const ACTIVE: Task['status'][] = ['queued', 'preparing', 'indexing', 'analyzing', 'scanning', 'reviewing']

function freshAnalyze(id: string, input: AnalyzeInput, repo: Repo, settings: Settings): Task {
  const now = new Date().toISOString()
  return {
    id,
    kind: 'analyze',
    title: titleFromProblem(input.question),
    repoId: repo.id,
    repoName: repo.name,
    owner: repo.owner,
    language: 'Go',
    branch: input.branch,
    commit: input.commit,
    status: 'queued',
    connection: 'connected',
    question: input.question,
    createdAt: now,
    updatedAt: now,
    eventSeq: 0,
    steps: makeSteps('analyze'),
    events: [],
    files: [],
    claims: [],
    findings: [],
    diff: [],
    summary: '任务已创建。接下来会检出固定 commit，再建立这一次运行的符号索引。',
    model: settings.model,
    promptVersion: settings.promptVersion,
    retrieval: settings.retrieval,
    budget: { toolCalls: 0, toolLimit: settings.toolLimit, modelCalls: 0 },
    commentPosted: false,
  }
}

function freshReview(id: string, repo: Repo, settings: Settings): Task {
  const now = new Date().toISOString()
  const pr = nextReviewHead
  return {
    id,
    kind: 'review',
    title: `PR #${pr.number} ${pr.title}`,
    repoId: repo.id,
    repoName: repo.name,
    owner: repo.owner,
    language: 'Go',
    branch: pr.headRef,
    commit: pr.headSha,
    status: 'queued',
    connection: 'connected',
    question: '',
    pr,
    createdAt: now,
    updatedAt: now,
    eventSeq: 0,
    steps: makeSteps('review'),
    events: [],
    files: [],
    claims: [],
    findings: [],
    diff: [],
    summary: '已接收 Pull Request。只会审核本次 diff，并按固定命令扫描。',
    model: settings.model,
    promptVersion: 'review-v1',
    retrieval: settings.retrieval,
    budget: { toolCalls: 0, toolLimit: settings.toolLimit, modelCalls: 0 },
    commentPosted: false,
  }
}

function sameDelivery(task: Task, repoId: string, number: number, headSha: string): boolean {
  return task.kind === 'review' && task.repoId === repoId && task.pr?.number === number && task.commit === headSha
}

export function RepoPilotProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(() => createSeedTasks())
  const [repos, setRepos] = useState<Repo[]>(() => loadRepos(seedRepos))
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [experimentList, setExperimentList] = useState<Experiment[]>(seedExperiments)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [currentRepoId, setCurrentRepoId] = useState('mypaper')
  const seq = useRef(2015)
  const tasksRef = useRef(tasks)
  const reposRef = useRef(repos)
  const settingsRef = useRef(settings)
  const timers = useRef<Map<string, number[]>>(new Map())
  const paused = useRef<Set<string>>(new Set())
  const playing = useRef<Set<string>>(new Set())
  const queues = useRef<Map<string, SimAction[]>>(new Map())
  const cursors = useRef<Map<string, number>>(new Map())
  const runNextRef = useRef<(taskId: string) => void>(() => {})

  const clearTimers = useCallback((taskId: string) => {
    for (const handle of timers.current.get(taskId) ?? []) window.clearTimeout(handle)
    timers.current.set(taskId, [])
    playing.current.delete(taskId)
  }, [])

  useEffect(() => {
    tasksRef.current = tasks
    reposRef.current = repos
    settingsRef.current = settings
    runNextRef.current = (taskId: string) => {
      if (paused.current.has(taskId) || playing.current.has(taskId)) return
      const queue = queues.current.get(taskId)
      const index = cursors.current.get(taskId) ?? 0
      if (!queue || index >= queue.length) return
      const action = queue[index]
      playing.current.add(taskId)
      const handle = window.setTimeout(() => {
        playing.current.delete(taskId)
        if (paused.current.has(taskId)) return
        cursors.current.set(taskId, index + 1)
        setTasks((current) => current.map((task) => (task.id === taskId ? applyAction(task, action) : task)))
        runNextRef.current(taskId)
      }, action.delay)
      const list = timers.current.get(taskId) ?? []
      list.push(handle)
      timers.current.set(taskId, list)
    }
  })

  useEffect(() => {
    const timerMap = timers.current
    const playingSet = playing.current
    return () => {
      for (const handles of timerMap.values()) handles.forEach((handle) => window.clearTimeout(handle))
      playingSet.clear()
    }
  }, [])

  const pushToast = useCallback((text: string, tone: ToastTone = 'info') => {
    const id = crypto.randomUUID()
    setToasts((current) => [...current, { id, text, tone }].slice(-3))
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 4200)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const startQueue = useCallback(
    (taskId: string, actions: SimAction[]) => {
      clearTimers(taskId)
      paused.current.delete(taskId)
      queues.current.set(taskId, actions)
      cursors.current.set(taskId, 0)
      runNextRef.current(taskId)
    },
    [clearTimers],
  )

  const createAnalyze = useCallback(
    (input: AnalyzeInput) => {
      const repo = reposRef.current.find((item) => item.id === input.repoId)
      if (!repo) {
        pushToast('仓库不在允许名单里', 'err')
        return ''
      }
      const id = `RP-${seq.current}`
      seq.current += 1
      const task = freshAnalyze(id, input, repo, settingsRef.current)
      setTasks((current) => [task, ...current])
      setCurrentRepoId(repo.id)
      startQueue(id, planAnalyze(task, repo))
      return id
    },
    [pushToast, startQueue],
  )

  const ingestPullRequest = useCallback(
    (repoId: string, headSha?: string) => {
      const repo = reposRef.current.find((item) => item.id === repoId)
      if (!repo?.allowed) {
        pushToast('仓库不在允许名单，或 GitHub 安装未连接', 'err')
        return ''
      }
      const head = headSha ?? nextReviewHead.headSha
      const existing = tasksRef.current.find((task) => sameDelivery(task, repoId, nextReviewHead.number, head))
      if (existing?.commentPosted) {
        pushToast(`PR #${nextReviewHead.number} 的 ${head.slice(0, 7)} 已经评论过，不再发表`, 'info')
        return existing.id
      }
      if (existing && ACTIVE.includes(existing.status)) {
        pushToast(`${existing.id} 正在审核同一个 head，不会再开一次`, 'info')
        return existing.id
      }
      if (head !== nextReviewHead.headSha) {
        pushToast('这个 head 没有新的 diff 可以审核', 'info')
        return existing?.id ?? ''
      }
      const id = `RP-${seq.current}`
      seq.current += 1
      const task = freshReview(id, repo, settingsRef.current)
      setTasks((current) => [task, ...current])
      startQueue(id, planReview(task))
      pushToast('这是新的 head SHA，开始审核', 'ok')
      return id
    },
    [pushToast, startQueue],
  )

  const cancelTask = useCallback(
    (taskId: string) => {
      paused.current.add(taskId)
      clearTimers(taskId)
      const now = new Date().toISOString()
      setTasks((current) =>
        current.map((task) => {
          if (task.id !== taskId || !ACTIVE.includes(task.status)) return task
          const running = task.steps.find((step) => step.status === 'running')
          return {
            ...task,
            status: 'cancelled',
            connection: 'connected',
            updatedAt: now,
            steps: task.steps.map((step) =>
              step.status === 'running' ? { ...step, status: 'cancelled', detail: '已取消', finishedAt: now } : step,
            ),
            events: [
              ...task.events,
              {
                id: `${task.id}-cancel`,
                taskId: task.id,
                stepId: running?.id ?? task.steps[0]?.id ?? 'validate',
                kind: 'status',
                name: '取消',
                summary: '用户取消了这次运行。已完成的步骤不会重做。',
                status: 'completed',
                at: now,
              },
            ],
            eventSeq: task.eventSeq + 1,
          }
        }),
      )
      pushToast(`已取消 ${taskId}`, 'info')
    },
    [clearTimers, pushToast],
  )

  const retryTask = useCallback(
    (taskId: string) => {
      const task = tasksRef.current.find((item) => item.id === taskId)
      if (!task || task.status !== 'failed') return
      const repo = reposRef.current.find((item) => item.id === task.repoId)
      const failedId = task.failedStepId ?? task.steps.find((step) => step.status === 'failed')?.id
      const failedIndex = task.steps.findIndex((step) => step.id === failedId)
      const now = new Date().toISOString()
      const reset: Task = {
        ...task,
        status: 'queued',
        connection: 'connected',
        updatedAt: now,
        errorSummary: undefined,
        failedStepId: undefined,
        steps: task.steps.map((step, index) =>
          failedIndex >= 0 && index >= failedIndex
            ? { ...step, status: 'pending', detail: '等待重试', startedAt: undefined, finishedAt: undefined, durationMs: undefined }
            : step,
        ),
      }
      setTasks((current) => current.map((item) => (item.id === taskId ? reset : item)))
      const script = task.kind === 'review' ? planReview(reset) : planAnalyze(reset, repo)
      const startAt = resumeIndex(script, failedId)
      clearTimers(taskId)
      paused.current.delete(taskId)
      queues.current.set(taskId, script)
      cursors.current.set(taskId, startAt)
      runNextRef.current(taskId)
      pushToast(failedId ? `从失败的步骤继续 ${taskId}` : `正在重试 ${taskId}`, 'info')
    },
    [clearTimers, pushToast],
  )

  const reconnectTask = useCallback(
    (taskId: string) => {
      const task = tasksRef.current.find((item) => item.id === taskId)
      if (!task) return
      setTasks((current) => current.map((item) => (item.id === taskId ? { ...item, connection: 'reconnecting' } : item)))
      window.setTimeout(() => {
        const latest = tasksRef.current.find((item) => item.id === taskId)
        if (!latest) return
        paused.current.delete(taskId)
        const existing = queues.current.get(taskId)
        const cursor = cursors.current.get(taskId) ?? 0
        const live = ACTIVE.includes(latest.status)
        if ((!existing || cursor >= existing.length) && live) {
          const script = planContinuation(latest)
          if (script.length > 0) {
            queues.current.set(taskId, script)
            cursors.current.set(taskId, 0)
          }
        }
        setTasks((current) => current.map((item) => (item.id === taskId ? { ...item, connection: 'connected' } : item)))
        const queue = queues.current.get(taskId)
        const next = cursors.current.get(taskId) ?? 0
        const canResume = Boolean(queue && next < queue.length && live)
        if (canResume && !playing.current.has(taskId)) {
          pushToast(`已按 ${taskId} 继续接收事件`, 'ok')
          runNextRef.current(taskId)
          return
        }
        pushToast(canResume ? `${taskId} 的事件流仍在接收` : `${taskId} 没有新的事件`, 'info')
      }, 650)
    },
    [pushToast],
  )

  const addRepo = useCallback((input: RepoInput) => {
    const base = input.name.toLowerCase()
    const id = reposRef.current.some((repo) => repo.id === base) ? `${base}-${seq.current}` : base
    const branch = input.defaultBranch || 'main'
    const repo: Repo = {
      id,
      owner: input.owner,
      name: input.name,
      language: 'Go',
      defaultBranch: branch,
      branches: [{ name: branch, commit: input.commit }],
      installation: 'connected',
      allowed: true,
    }
    const next = [...reposRef.current, repo]
    reposRef.current = next
    setRepos(next)
    saveRepos(next)
    setCurrentRepoId(id)
    return id
  }, [])

  const removeRepo = useCallback(
    (repoId: string) => {
      const next = reposRef.current.filter((repo) => repo.id !== repoId)
      reposRef.current = next
      setRepos(next)
      saveRepos(next)
      setCurrentRepoId((current) => (current === repoId ? '' : current))
      pushToast('已从允许名单移除', 'info')
    },
    [pushToast],
  )

  const updateSettings = useCallback(
    (next: Settings) => {
      const saved = {
        ...next,
        githubToken: next.githubToken.trim(),
        githubApiBase: next.githubApiBase.trim() || 'https://api.github.com',
      }
      setSettings(saved)
      saveSettings(saved)
      pushToast('设置已保存在这台浏览器', 'ok')
    },
    [pushToast],
  )

  const saveExperiment = useCallback(
    (draft: ExperimentDraft) => {
      const exists = experimentList.find(
        (item) => item.dataset === draft.dataset && item.model === draft.model && item.prompt === draft.prompt && item.retrieval === draft.retrieval,
      )
      if (exists) {
        pushToast(exists.metrics ? '这个配置已有实验结果' : '这个配置已保存，尚未运行', 'info')
        return
      }
      setExperimentList((current) => [
        { id: `exp-${seq.current}`, ...draft, savedAt: new Date().toISOString(), cases: [] },
        ...current,
      ])
      seq.current += 1
      pushToast('已保存配置。没有跑过的组合不显示数字。', 'ok')
    },
    [experimentList, pushToast],
  )

  const api = useMemo<PilotApi>(
    () => ({
      tasks,
      repos,
      settings,
      experiments: experimentList,
      toasts,
      currentRepoId,
      setCurrentRepoId,
      dismissToast,
      pushToast,
      createAnalyze,
      ingestPullRequest,
      cancelTask,
      retryTask,
      reconnectTask,
      addRepo,
      removeRepo,
      updateSettings,
      saveExperiment,
    }),
    [
      tasks,
      repos,
      settings,
      experimentList,
      toasts,
      currentRepoId,
      dismissToast,
      pushToast,
      createAnalyze,
      ingestPullRequest,
      cancelTask,
      retryTask,
      reconnectTask,
      addRepo,
      removeRepo,
      updateSettings,
      saveExperiment,
    ],
  )

  return <PilotContext.Provider value={api}>{children}</PilotContext.Provider>
}

function resumeIndex(script: SimAction[], failedId: StepId | undefined): number {
  if (!failedId) return 0
  const index = script.findIndex((action) => action.type === 'step' && action.stepId === failedId && action.status === 'running')
  return index < 0 ? 0 : index
}
