import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

const MAX_BODY = 2_000_000

export function githubProxy(): Plugin {
  return {
    name: 'repopilot-github-proxy',
    configureServer(server) {
      server.middlewares.use(handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle)
    },
  }
}

function handle(req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) {
  const requestUrl = new URL(req.url ?? '/', 'http://127.0.0.1')
  if (!requestUrl.pathname.startsWith('/api/github')) {
    next()
    return
  }
  void forward(req, res, requestUrl).catch(() => {
    if (res.headersSent) return
    sendJson(res, 502, { error: '无法连接 GitHub' })
  })
}

async function forward(req: IncomingMessage, res: ServerResponse, requestUrl: URL) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: '只允许读取 GitHub' })
    return
  }
  const githubPath = requestUrl.pathname.slice('/api/github'.length) || '/'
  if (!isAllowedPath(githubPath)) {
    sendJson(res, 404, { error: '这个 GitHub 路径未开放' })
    return
  }
  const token = headerValue(req.headers['x-github-token'])
  if (!token || token.length < 8 || token.length > 256 || !/^[A-Za-z0-9_]+$/.test(token)) {
    sendJson(res, 400, { error: '缺少有效的 GitHub 访问令牌' })
    return
  }
  const apiBase = normalizeBase(headerValue(req.headers['x-github-api-base']) ?? '')
  if (!apiBase) {
    sendJson(res, 400, { error: 'GitHub API 地址无效' })
    return
  }
  if (githubPath.endsWith('/branch-commit')) {
    const ref = requestUrl.searchParams.get('ref') ?? ''
    if (!ref || ref.length > 250 || /[\r\n]/.test(ref)) {
      sendJson(res, 400, { error: '缺少分支名' })
      return
    }
  }
  const target = new URL(githubRelative(githubPath, requestUrl), `${apiBase}/`)
  if (target.origin !== new URL(apiBase).origin) {
    sendJson(res, 400, { error: 'GitHub API 地址无效' })
    return
  }
  const response = await fetch(target, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'repopilot',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (response.status >= 300 && response.status < 400) {
    sendJson(res, 502, { error: 'GitHub 返回了跳转，已停止请求' })
    return
  }
  const body = Buffer.from(await response.arrayBuffer())
  if (body.length > MAX_BODY) {
    sendJson(res, 502, { error: 'GitHub 响应过大' })
    return
  }
  res.statusCode = response.status
  res.setHeader('Content-Type', response.headers.get('content-type') ?? 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-RepoPilot-Proxy', '1')
  const link = response.headers.get('link')
  if (link) res.setHeader('Link', link)
  res.end(body)
}

function githubRelative(githubPath: string, requestUrl: URL): string {
  const branchCommit = githubPath.match(/^\/repos\/([^/]+)\/([^/]+)\/branch-commit$/)
  if (!branchCommit) return `${githubPath.replace(/^\//, '')}${requestUrl.search}`
  const ref = requestUrl.searchParams.get('ref') ?? ''
  return `repos/${encodeURIComponent(branchCommit[1])}/${encodeURIComponent(branchCommit[2])}/commits/${encodeURIComponent(ref)}`
}

function isAllowedPath(path: string): boolean {
  if (path.includes('..') || path.includes('//')) return false
  if (path === '/user' || path === '/user/repos') return true
  return /^\/repos\/[^/]+\/[^/]+\/branch-commit$/.test(path)
}

function normalizeBase(value: string): string | null {
  const text = value.trim() || 'https://api.github.com'
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null
  if (blockedHost(url.hostname)) return null
  const path = url.pathname.replace(/\/+$/, '')
  if (path !== '' && path !== '/api/v3') return null
  url.pathname = path
  url.search = ''
  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

function blockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal'
  ) {
    return true
  }
  if (host.includes(':')) {
    return host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')
  }
  const parts = host.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [a, b] = parts
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

function headerValue(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text || /[\r\n]/.test(text)) return null
  return text
}

function sendJson(res: ServerResponse, status: number, body: { error: string }) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-RepoPilot-Proxy', '1')
  res.end(JSON.stringify(body))
}
