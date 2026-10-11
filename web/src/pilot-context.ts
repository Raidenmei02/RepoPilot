import { createContext, useContext } from 'react'
import type { AnalyzeInput, Experiment, ExperimentDraft, Repo, Settings, Task, ToastMessage, ToastTone } from './types'

export interface RepoInput {
  owner: string
  name: string
  defaultBranch: string
  commit: string
}

export interface PilotApi {
  tasks: Task[]
  repos: Repo[]
  settings: Settings
  experiments: Experiment[]
  toasts: ToastMessage[]
  currentRepoId: string
  setCurrentRepoId: (id: string) => void
  dismissToast: (id: string) => void
  pushToast: (text: string, tone?: ToastTone) => void
  createAnalyze: (input: AnalyzeInput) => string
  ingestPullRequest: (repoId: string, headSha?: string) => string
  cancelTask: (id: string) => void
  retryTask: (id: string) => void
  reconnectTask: (id: string) => void
  addRepo: (input: RepoInput) => string
  removeRepo: (id: string) => void
  updateSettings: (next: Settings) => void
  saveExperiment: (input: ExperimentDraft) => void
}

export const PilotContext = createContext<PilotApi | null>(null)

export function useRepoPilot(): PilotApi {
  const value = useContext(PilotContext)
  if (!value) throw new Error('useRepoPilot must be used within RepoPilotProvider')
  return value
}
