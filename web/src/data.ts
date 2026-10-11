import { hoursAgo } from './lib/format'
import type { CodeRef, DiffFile, Experiment, Finding, Repo, ReportClaim, Settings, Task } from './types'

export const SHA = {
  order: 'a14c9f2e8b3140aa91c0d77e6e51b0a9c3d21f60',
  orderBase: '6f2a91c0b18e4d55aa0912bb7c0e1184d9a33c11',
  nextHead: 'c31ab90e7712456aa1098ccde4410bb81290af34',
  pool: '91de440ab12c4e7781aa09c0d4412bb77e10aa19',
}

export const defaultSettings: Settings = {
  provider: 'OpenAI 兼容接口',
  model: 'gpt-4.1',
  promptVersion: 'analyze-v1',
  retrieval: 'go-ast',
  toolLimit: 8,
  timeoutMin: 10,
  githubToken: '',
  githubApiBase: 'https://api.github.com',
}

export const repos: Repo[] = [
  {
    id: 'mypaper',
    owner: 'yourname',
    name: 'mypaper',
    language: 'Go',
    defaultBranch: 'main',
    branches: [
      { name: 'main', commit: SHA.orderBase },
      { name: 'feature/order', commit: SHA.order },
    ],
    installation: 'connected',
    allowed: true,
  },
  {
    id: 'backend-service',
    owner: 'yourname',
    name: 'backend-service',
    language: 'Go',
    defaultBranch: 'main',
    branches: [{ name: 'main', commit: SHA.pool }],
    installation: 'connected',
    allowed: true,
  },
  {
    id: 'payments-api',
    owner: 'yourname',
    name: 'payments-api',
    language: 'Go',
    defaultBranch: 'main',
    branches: [{ name: 'main', commit: SHA.nextHead }],
    installation: 'missing',
    allowed: false,
  },
]

export const serviceCode = `func (s *OrderService) CreateOrder(ctx context.Context, req CreateRequest) (*Order, error) {
    if req.Qty <= 0 {
        return nil, ErrInvalidQty
    }
    if err := s.repo.DeductStock(ctx, req.SKU, req.Qty); err != nil {
        return nil, fmt.Errorf("deduct stock: %w", err)
    }
    return s.repo.InsertOrder(ctx, req)
}`

export const repoCode = `func (r *Repo) DeductStock(ctx context.Context, sku string, qty int) error {
    _, err := r.db.ExecContext(ctx,
        "UPDATE inventory SET available = available - ? WHERE sku = ? AND available >= ?",
        qty, sku, qty)
    return err
}`

export const orderTypeCode = `type OrderService struct {
    repo OrderRepository
}

type CreateRequest struct {
    SKU string
    Qty int
}`

export const testCode = `func TestCreateOrderDeductsStock(t *testing.T) {
    svc := newService(t)
    _, err := svc.CreateOrder(context.Background(), CreateRequest{SKU: "SKU-19", Qty: 1})
    if err != nil {
        t.Fatal(err)
    }
}`

export const serviceFile: CodeRef = {
  id: 'svc',
  path: 'internal/order/service.go',
  language: 'go',
  symbol: 'OrderService.CreateOrder',
  reason: '创建订单的入口，直接调用库存扣减。',
  confidence: 'high',
  startLine: 140,
  content: serviceCode,
}

export const stockFile: CodeRef = {
  id: 'stock',
  path: 'internal/order/repository.go',
  language: 'go',
  symbol: 'Repo.DeductStock',
  reason: '库存更新发生在这个函数。',
  confidence: 'high',
  startLine: 88,
  content: repoCode,
}

export const typeFile: CodeRef = {
  id: 'types',
  path: 'internal/order/types.go',
  language: 'go',
  symbol: 'OrderService',
  reason: '服务只持有订单仓储，没有单独的库存服务。',
  confidence: 'high',
  startLine: 12,
  content: orderTypeCode,
}

export const testFile: CodeRef = {
  id: 'test',
  path: 'internal/order/service_test.go',
  language: 'go',
  symbol: 'TestCreateOrderDeductsStock',
  reason: '测试覆盖了创建订单这条路径。',
  confidence: 'high',
  startLine: 40,
  content: testCode,
}

export const orderClaims: ReportClaim[] = [
  {
    id: 'c1',
    kind: 'function',
    symbol: 'OrderService.CreateOrder',
    text: '创建订单从 CreateOrder 进入，数量不合法时直接返回。',
    path: 'internal/order/service.go',
    line: 140,
  },
  {
    id: 'c2',
    kind: 'function',
    symbol: 'Repo.DeductStock',
    text: '库存扣减在 DeductStock，使用一条带条件的 UPDATE。',
    path: 'internal/order/repository.go',
    line: 88,
  },
  {
    id: 'c3',
    kind: 'caller',
    symbol: 'CreateOrder → DeductStock',
    text: 'CreateOrder 在写入订单之前调用 DeductStock。',
    path: 'internal/order/service.go',
    line: 144,
  },
  {
    id: 'c4',
    kind: 'type',
    symbol: 'OrderService',
    text: 'OrderService 只依赖 OrderRepository，扣减和插入都走同一个仓储。',
    path: 'internal/order/types.go',
    line: 12,
  },
  {
    id: 'c5',
    kind: 'test',
    symbol: 'TestCreateOrderDeductsStock',
    text: 'service_test.go 里有覆盖这条路径的测试。',
    path: 'internal/order/service_test.go',
    line: 40,
  },
]

export const prDiff: DiffFile = {
  path: 'internal/order/repository.go',
  reason: '这次 PR 把库存更新改成了拼接 SQL。',
  lines: [
    { kind: 'ctx', oldNo: 88, newNo: 88, text: 'func (r *Repo) DeductStock(ctx context.Context, sku string, qty int) error {' },
    { kind: 'del', oldNo: 89, text: '    _, err := r.db.ExecContext(ctx,' },
    { kind: 'del', oldNo: 90, text: '        "UPDATE inventory SET available = available - ? WHERE sku = ?",' },
    { kind: 'del', oldNo: 91, text: '        qty, sku)' },
    { kind: 'add', newNo: 89, text: '    query := "UPDATE inventory SET available = available - ? WHERE sku = \'" + sku + "\'"' },
    { kind: 'add', newNo: 90, text: '    _, err := r.db.ExecContext(ctx, query, qty)' },
    { kind: 'ctx', oldNo: 92, newNo: 91, text: '    return err' },
    { kind: 'ctx', oldNo: 93, newNo: 92, text: '}' },
  ],
}

export const reviewFindings: Finding[] = [
  {
    id: 'f-gosec',
    path: 'internal/order/repository.go',
    line: 89,
    rule: 'G202',
    severity: 'error',
    summary: 'SQL 字符串拼接了 sku。',
    evidence: 'gosec: G202: SQL string concatenation (repository.go:89)',
    inDiff: true,
    published: true,
  },
  {
    id: 'f-staticcheck',
    path: 'internal/order/repository.go',
    line: 90,
    rule: 'SA1019',
    severity: 'warning',
    summary: '查询构造绕过了参数绑定。',
    evidence: 'staticcheck: SA1019: repository.go:90',
    inDiff: true,
    published: true,
  },
  {
    id: 'f-dropped',
    path: 'internal/order/service.go',
    line: 20,
    rule: 'SA4006',
    severity: 'info',
    summary: '未使用的赋值不在本次 diff 里。',
    evidence: 'staticcheck: SA4006: service.go:20',
    inDiff: false,
    published: false,
  },
]

export const sampleQuestion = '订单创建时，库存是在哪里扣减的？相关类型、调用方和测试在什么位置？'

function doneStep(id: Task['steps'][number]['id'], label: string, detail: string, end: string, minutes: number, durationMs: number): Task['steps'][number] {
  return {
    id,
    label,
    status: 'completed',
    detail,
    startedAt: new Date(new Date(end).getTime() - minutes * 60_000).toISOString(),
    finishedAt: end,
    durationMs,
  }
}

export function createSeedTasks(settings: Settings = defaultSettings): Task[] {
  const end = hoursAgo(0, 50)
  const reviewEnd = hoursAgo(3)
  const live = hoursAgo(0, 8)
  const analyze: Task = {
    id: 'RP-2001',
    kind: 'analyze',
    title: '订单创建时，库存是在哪里扣减的',
    repoId: 'mypaper',
    repoName: 'mypaper',
    owner: 'yourname',
    language: 'Go',
    branch: 'feature/order',
    commit: SHA.order,
    status: 'completed',
    connection: 'connected',
    question: sampleQuestion,
    createdAt: hoursAgo(1, 10),
    updatedAt: end,
    eventSeq: 4,
    steps: [
      doneStep('validate', '校验输入', '仓库在允许名单内', end, 20, 120),
      doneStep('prepare', '检出 commit', '已检出固定 commit', end, 18, 900),
      doneStep('index', '建立索引', '函数、类型和调用名已写入本 run', end, 16, 1400),
      doneStep('analyze', '只读分析', '五个只读工具已用完所需证据', end, 12, 3200),
      doneStep('report', '生成报告', '每条结论都能对上索引', end, 6, 400),
    ],
    events: [
      {
        id: 'RP-2001-e1',
        taskId: 'RP-2001',
        stepId: 'analyze',
        kind: 'tool',
        name: 'get_symbol',
        summary: '按名字读取 CreateOrder。',
        status: 'completed',
        input: 'symbol: OrderService.CreateOrder',
        output: 'internal/order/service.go:140',
        at: hoursAgo(0, 58),
        durationMs: 180,
      },
      {
        id: 'RP-2001-e2',
        taskId: 'RP-2001',
        stepId: 'analyze',
        kind: 'tool',
        name: 'find_references',
        summary: '查找 DeductStock 的调用方。',
        status: 'completed',
        input: 'symbol: Repo.DeductStock',
        output: 'internal/order/service.go:144 CreateOrder',
        at: hoursAgo(0, 56),
        durationMs: 240,
      },
      {
        id: 'RP-2001-e3',
        taskId: 'RP-2001',
        stepId: 'report',
        kind: 'decision',
        name: '报告',
        summary: '五条结论都带有文件和行号。',
        status: 'completed',
        output: '保留 5 条，丢弃 0 条无法对上索引的句子。',
        at: end,
      },
    ],
    files: [serviceFile, stockFile, typeFile, testFile],
    claims: orderClaims,
    findings: [],
    diff: [],
    summary: '库存扣减发生在 Repo.DeductStock。CreateOrder 在插入订单前调用它。类型定义和测试位置都在 internal/order。',
    model: settings.model,
    promptVersion: settings.promptVersion,
    retrieval: settings.retrieval,
    budget: { toolCalls: 5, toolLimit: settings.toolLimit, modelCalls: 2 },
    commentPosted: false,
  }

  const dropped: Task = {
    ...analyze,
    id: 'RP-2008',
    title: '连接池是在哪里创建的',
    repoId: 'backend-service',
    repoName: 'backend-service',
    branch: 'main',
    commit: SHA.pool,
    status: 'analyzing',
    connection: 'disconnected',
    question: '数据库连接池在哪里创建，谁在调用它？',
    createdAt: hoursAgo(0, 14),
    updatedAt: live,
    eventSeq: 2,
    claims: [],
    files: [],
    summary: '索引已经完成。分析进行到一半时事件流中断，已保存的步骤还在。',
    steps: [
      doneStep('validate', '校验输入', '仓库在允许名单内', live, 8, 100),
      doneStep('prepare', '检出 commit', '已检出固定 commit', live, 6, 800),
      doneStep('index', '建立索引', '本 run 的符号索引已写入', live, 4, 1100),
      { id: 'analyze', label: '只读分析', status: 'running', detail: '正在读取 NewPool', startedAt: live },
      { id: 'report', label: '生成报告', status: 'pending', detail: '等待开始' },
    ],
    events: [
      {
        id: 'RP-2008-e1',
        taskId: 'RP-2008',
        stepId: 'analyze',
        kind: 'tool',
        name: 'search_code',
        summary: '检索 NewPool。',
        status: 'completed',
        input: 'query: func NewPool',
        output: 'internal/db/pool.go:24',
        at: hoursAgo(0, 9),
        durationMs: 200,
      },
      {
        id: 'RP-2008-e2',
        taskId: 'RP-2008',
        stepId: 'analyze',
        kind: 'status',
        name: '事件流',
        summary: '订阅中断。可以用这个 run_id 继续接收。',
        status: 'failed',
        error: '事件流中断',
        at: live,
      },
    ],
    budget: { toolCalls: 1, toolLimit: settings.toolLimit, modelCalls: 1 },
  }

  const review: Task = {
    id: 'RP-2014',
    kind: 'review',
    title: 'PR #42 库存更新改成拼接 SQL',
    repoId: 'mypaper',
    repoName: 'mypaper',
    owner: 'yourname',
    language: 'Go',
    branch: 'feature/order',
    commit: SHA.order,
    status: 'commented',
    connection: 'connected',
    question: '',
    pr: {
      number: 42,
      title: '库存更新改成拼接 SQL',
      baseRef: 'main',
      headRef: 'feature/order',
      baseSha: SHA.orderBase,
      headSha: SHA.order,
    },
    createdAt: hoursAgo(4),
    updatedAt: reviewEnd,
    eventSeq: 3,
    steps: [
      doneStep('validate', '校验输入', '安装权限和仓库名单通过，未重复', reviewEnd, 30, 80),
      doneStep('prepare', '检出 commit', '已检出 head', reviewEnd, 28, 860),
      doneStep('index', '建立索引', '只索引了变更包和调用方', reviewEnd, 24, 700),
      doneStep('scan', '固定扫描', '四个扫描器已按固定命令跑完', reviewEnd, 18, 4200),
      doneStep('review', '组织评论', '行号不在 diff 内的意见已丢弃', reviewEnd, 10, 600),
      doneStep('comment', '发表评论', '已发表评论型 review', reviewEnd, 4, 300),
    ],
    events: [
      {
        id: 'RP-2014-e1',
        taskId: 'RP-2014',
        stepId: 'scan',
        kind: 'scanner',
        name: 'gosec',
        summary: 'gosec ./... 发现 G202。',
        status: 'completed',
        input: 'gosec ./...',
        output: 'G202 repository.go:89',
        at: hoursAgo(3, 20),
        durationMs: 1600,
      },
      {
        id: 'RP-2014-e2',
        taskId: 'RP-2014',
        stepId: 'review',
        kind: 'decision',
        name: '评论草稿',
        summary: '两条意见落在 diff 上，一条因行号不在 diff 内被丢弃。',
        status: 'completed',
        output: 'published 2, dropped 1',
        at: hoursAgo(3, 8),
      },
      {
        id: 'RP-2014-e3',
        taskId: 'RP-2014',
        stepId: 'comment',
        kind: 'status',
        name: 'GitHub Review',
        summary: '已发表评论。没有批准，没有合并，没有推送。',
        status: 'completed',
        at: reviewEnd,
      },
    ],
    files: [stockFile],
    claims: [],
    findings: reviewFindings,
    diff: [prDiff],
    summary: '扫描器在本次 diff 上确认了两处问题。评论已发到 GitHub，Check Run 标记完成。',
    model: settings.model,
    promptVersion: 'review-v1',
    retrieval: settings.retrieval,
    budget: { toolCalls: 2, toolLimit: settings.toolLimit, modelCalls: 1 },
    commentPosted: true,
  }

  const scanFailed: Task = {
    id: 'RP-2011',
    kind: 'review',
    title: 'PR #38 连接池超时配置',
    repoId: 'backend-service',
    repoName: 'backend-service',
    owner: 'yourname',
    language: 'Go',
    branch: 'main',
    commit: SHA.pool,
    status: 'failed',
    connection: 'connected',
    question: '',
    pr: {
      number: 38,
      title: '连接池超时配置',
      baseRef: 'main',
      headRef: 'fix/pool',
      baseSha: SHA.pool,
      headSha: SHA.pool,
    },
    createdAt: hoursAgo(26),
    updatedAt: hoursAgo(25),
    eventSeq: 2,
    failedStepId: 'scan',
    errorSummary: 'govulncheck 超过任务时间预算，扫描步骤失败。尚未发表评论。',
    steps: [
      doneStep('validate', '校验输入', '通过', hoursAgo(25), 20, 70),
      doneStep('prepare', '检出 commit', '已检出 head', hoursAgo(25), 18, 800),
      doneStep('index', '建立索引', '变更包已索引', hoursAgo(25), 14, 640),
      {
        id: 'scan',
        label: '固定扫描',
        status: 'failed',
        detail: 'govulncheck 超时',
        startedAt: hoursAgo(25, 10),
        finishedAt: hoursAgo(25),
        durationMs: 30000,
      },
      { id: 'review', label: '组织评论', status: 'pending', detail: '等待开始' },
      { id: 'comment', label: '发表评论', status: 'pending', detail: '等待开始' },
    ],
    events: [
      {
        id: 'RP-2011-e1',
        taskId: 'RP-2011',
        stepId: 'scan',
        kind: 'scanner',
        name: 'govulncheck',
        summary: '固定命令超时。参数没有被模型修改。',
        status: 'failed',
        input: 'govulncheck ./...',
        error: 'signal: killed after timeout',
        at: hoursAgo(25),
        durationMs: 30000,
      },
    ],
    files: [],
    claims: [],
    findings: [],
    diff: [],
    summary: '扫描没有完成，所以没有评论。',
    model: settings.model,
    promptVersion: 'review-v1',
    retrieval: settings.retrieval,
    budget: { toolCalls: 0, toolLimit: settings.toolLimit, modelCalls: 0 },
    commentPosted: false,
  }

  return [dropped, analyze, review, scanFailed]
}

export const experiments: Experiment[] = [
  {
    id: 'exp-ast',
    name: 'go-ast-v1',
    dataset: 'order-fixture',
    model: 'gpt-4.1',
    prompt: 'analyze-v1',
    retrieval: 'go-ast',
    savedAt: hoursAgo(20),
    metrics: { symbolHit: 1, commentOnDiff: 1, findingKept: 0.67, avgSeconds: 18, modelCalls: 2 },
    cases: [
      {
        id: 'case-hit',
        title: 'CreateOrder 与 DeductStock 都命中索引',
        repo: 'mypaper',
        outcome: 'hit',
        reason: '报告中的函数和行号能在该 run 的符号索引里查到。',
        trace: [
          { name: 'get_symbol', summary: '读取 CreateOrder。', input: 'OrderService.CreateOrder', output: 'service.go:140' },
          { name: 'find_references', summary: '查找调用方。', input: 'Repo.DeductStock', output: 'service.go:144' },
        ],
      },
      {
        id: 'case-drop',
        title: '不在 diff 上的 SA4006 被丢弃',
        repo: 'mypaper',
        outcome: 'dropped',
        reason: '扫描有发现，但行号不在 base...head 的变更里，评论草稿被丢掉。',
        trace: [
          { name: 'staticcheck', summary: '报告 SA4006。', input: 'staticcheck ./...', output: 'service.go:20' },
          { name: 'filter', summary: '对照 diff 丢弃。', input: 'line 20', output: 'published: false' },
        ],
      },
    ],
  },
  {
    id: 'exp-text',
    name: 'text-only',
    dataset: 'order-fixture',
    model: 'gpt-4.1-mini',
    prompt: 'analyze-v0',
    retrieval: 'text',
    savedAt: hoursAgo(48),
    metrics: { symbolHit: 0.5, commentOnDiff: 0.5, findingKept: 0.33, avgSeconds: 11, modelCalls: 3 },
    cases: [
      {
        id: 'case-miss',
        title: '调用方没有进检索窗口',
        repo: 'mypaper',
        outcome: 'missed',
        reason: '文本检索找到了 DeductStock 的定义，没有返回 CreateOrder 这个调用点。',
        trace: [{ name: 'search_code', summary: '按名字检索。', input: 'DeductStock', output: 'repository.go:88' }],
      },
    ],
  },
]

export const nextReviewHead = {
  number: 42,
  title: '库存更新改成拼接 SQL',
  baseRef: 'main',
  headRef: 'feature/order',
  baseSha: SHA.orderBase,
  headSha: SHA.nextHead,
}
