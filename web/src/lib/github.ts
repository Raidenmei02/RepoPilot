import type { Settings } from '../types'

export interface GitHubAccess {
  githubToken: string
  githubApiBase: string
}

export interface RemoteRepository {
  id: number
  owner: string
  name: string
  description: string
  language: string
  defaultBranch: string
  private: boolean
}

export class GitHubRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'GitHubRequestError'
    this.status = status
  }
}

export function normalizeGitHubApiBase(value: string): string | null {
  const text = value.trim() || 'https://api.github.com'
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null
  const path = url.pathname.replace(/\/+$/, '')
  if (path !== '' && path !== '/api/v3') return null
  url.pathname = path
  url.search = ''
  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

export function githubApiBaseError(value: string): string {
  if (normalizeGitHubApiBase(value)) return ''
  return 'API 地址需要是 https://api.github.com，或 GitHub Enterprise 的 https://主机/api/v3'
}

export async function verifyGitHubAccess(access: GitHubAccess): Promise<string> {
  const payload = await githubJson(access, '/user')
  if (!payload || typeof payload !== 'object' || !('login' in payload) || typeof payload.login !== 'string') {
    throw new GitHubRequestError('GitHub 没有返回账号名', 502)
  }
  return payload.login
}

export async function listOwnedRepositories(access: GitHubAccess): Promise<RemoteRepository[]> {
  const items: RemoteRepository[] = []
  for (let page = 1; page <= 10; page += 1) {
    const payload = await githubJson(access, `/user/repos?affiliation=owner&per_page=100&sort=updated&page=${page}`)
    if (!Array.isArray(payload)) throw new GitHubRequestError('GitHub 返回的仓库列表无法识别', 502)
    for (const item of payload) {
      const repo = parseRepository(item)
      if (repo) items.push(repo)
    }
    if (payload.length < 100) break
  }
  return items
}

export async function readBranchCommit(access: GitHubAccess, owner: string, name: string, branch: string): Promise<string> {
  const payload = await githubJson(
    access,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/branch-commit?ref=${encodeURIComponent(branch)}`,
  )
  if (!payload || typeof payload !== 'object' || !('sha' in payload) || typeof payload.sha !== 'string') {
    throw new GitHubRequestError('GitHub 没有返回分支提交', 502)
  }
  if (!/^[0-9a-f]{40}$/i.test(payload.sha)) throw new GitHubRequestError('分支提交不是有效的 commit', 502)
  return payload.sha
}

async function githubJson(access: GitHubAccess, path: string): Promise<unknown> {
  const token = access.githubToken.trim()
  const base = normalizeGitHubApiBase(access.githubApiBase)
  if (!token) throw new GitHubRequestError('请先在设置里填写 GitHub 访问令牌', 0)
  if (!base) throw new GitHubRequestError(githubApiBaseError(access.githubApiBase), 0)
  let response: Response
  try {
    response = await fetch(`/api/github${path}`, {
      headers: {
        'X-GitHub-Token': token,
        'X-GitHub-Api-Base': base,
      },
    })
  } catch {
    throw new GitHubRequestError('无法连接本机的 GitHub 代理', 0)
  }
  if (!response.ok) throw new GitHubRequestError(await errorMessage(response), response.status)
  return response.json()
}

async function errorMessage(response: Response): Promise<string> {
  if (response.status === 401) return '令牌无效或已过期'
  if (response.status === 403) return '没有权限，或已超过 GitHub 频率限制'
  if (response.status === 404 && !response.headers.get('x-repopilot-proxy')) {
    return '当前页面没有 GitHub 代理，请用开发服务打开'
  }
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') return body.error
    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' && body.message !== 'Not Found') {
      return body.message
    }
  } catch {
    return '读取 GitHub 失败'
  }
  return '读取 GitHub 失败'
}

function parseRepository(value: unknown): RemoteRepository | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const owner = record.owner
  if (!owner || typeof owner !== 'object') return null
  const login = (owner as Record<string, unknown>).login
  if (typeof record.id !== 'number' || typeof record.name !== 'string' || typeof login !== 'string') return null
  if (typeof record.default_branch !== 'string') return null
  return {
    id: record.id,
    owner: login,
    name: record.name,
    description: typeof record.description === 'string' ? record.description : '',
    language: typeof record.language === 'string' ? record.language : '',
    defaultBranch: record.default_branch,
    private: record.private === true,
  }
}

export function githubAccess(settings: Settings): GitHubAccess {
  return { githubToken: settings.githubToken, githubApiBase: settings.githubApiBase }
}
