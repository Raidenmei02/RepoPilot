import { defaultSettings } from './data'
import { normalizeGitHubApiBase } from './lib/github'
import type { Repo, Settings } from './types'

const SETTINGS_KEY = 'repopilot.settings'
const REPOS_KEY = 'repopilot.repos'

export function loadSettings(): Settings {
  const stored = readJson(SETTINGS_KEY)
  if (!stored || typeof stored !== 'object') return defaultSettings
  const record = stored as Partial<Settings>
  const toolLimit = numberIn(record.toolLimit, 1, 20, defaultSettings.toolLimit)
  const timeoutMin = numberIn(record.timeoutMin, 1, 60, defaultSettings.timeoutMin)
  return {
    provider: text(record.provider, defaultSettings.provider),
    model: text(record.model, defaultSettings.model),
    promptVersion: text(record.promptVersion, defaultSettings.promptVersion),
    retrieval: record.retrieval === 'text' ? 'text' : defaultSettings.retrieval,
    toolLimit,
    timeoutMin,
    githubToken: text(record.githubToken, ''),
    githubApiBase: normalizeGitHubApiBase(text(record.githubApiBase, '')) ?? defaultSettings.githubApiBase,
  }
}

export function saveSettings(settings: Settings) {
  writeJson(SETTINGS_KEY, settings)
}

export function loadRepos(fallback: Repo[]): Repo[] {
  if (!hasKey(REPOS_KEY)) return fallback
  const stored = readJson(REPOS_KEY)
  if (!Array.isArray(stored)) return fallback
  return stored.filter(isRepo)
}

export function saveRepos(repos: Repo[]) {
  writeJson(REPOS_KEY, repos)
}

function isRepo(value: unknown): value is Repo {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<Repo>
  return (
    typeof record.id === 'string' &&
    typeof record.owner === 'string' &&
    typeof record.name === 'string' &&
    record.language === 'Go' &&
    typeof record.defaultBranch === 'string' &&
    (record.installation === 'connected' || record.installation === 'missing') &&
    typeof record.allowed === 'boolean' &&
    Array.isArray(record.branches) &&
    record.branches.every(
      (branch) =>
        Boolean(branch) &&
        typeof branch === 'object' &&
        typeof branch.name === 'string' &&
        typeof branch.commit === 'string',
    )
  )
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function numberIn(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

function hasKey(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null
  } catch {
    return false
  }
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 浏览器拒绝写入时保留当前内存状态。
  }
}
