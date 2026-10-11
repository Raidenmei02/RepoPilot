import {
  orderClaims,
  prDiff,
  repoCode,
  reviewFindings,
  serviceCode,
  serviceFile,
  stockFile,
  testFile,
  typeFile,
} from './data'
import { shortSha } from './lib/format'
import { SCANNERS, type EventDraft, type SimAction } from './model'
import type { Repo, StepId, Task } from './types'

type WithoutDelay<T> = T extends unknown ? Omit<T, 'delay'> : never

function pause(ms: number, action: WithoutDelay<SimAction>): SimAction {
  return { delay: ms, ...action } as SimAction
}

function ev(stepId: StepId, partial: Omit<EventDraft, 'stepId'>): EventDraft {
  return { stepId, ...partial }
}

export function planAnalyze(task: Task, repo: Repo | undefined): SimAction[] {
  if (!repo?.allowed) {
    return [
      pause(300, { type: 'step', stepId: 'validate', status: 'running', detail: '正在核对允许名单' }),
      pause(500, {
        type: 'event',
        event: ev('validate', {
          key: 'deny',
          kind: 'error',
          name: 'ValidateInput',
          summary: '仓库不在允许名单内，或 GitHub 安装未连接。',
          status: 'failed',
          error: 'repository is not allowed',
        }),
      }),
      pause(120, { type: 'step', stepId: 'validate', status: 'failed', detail: '未通过允许名单' }),
      pause(80, { type: 'status', status: 'failed', errorSummary: '仓库不在允许名单内。', failedStepId: 'validate' }),
    ]
  }
  const sha = shortSha(task.commit)
  return [
    pause(280, { type: 'step', stepId: 'validate', status: 'running', detail: '正在校验问题和 commit' }),
    pause(400, {
      type: 'event',
      event: ev('validate', {
        key: 'ok',
        kind: 'status',
        name: 'ValidateInput',
        summary: '仓库在允许名单内，问题非空，commit 可解析。',
        status: 'completed',
      }),
    }),
    pause(120, { type: 'step', stepId: 'validate', status: 'completed', detail: '校验通过' }),
    pause(240, { type: 'step', stepId: 'prepare', status: 'running', detail: `正在检出 ${sha}` }),
    pause(700, {
      type: 'event',
      event: ev('prepare', {
        key: 'checkout',
        kind: 'tool',
        name: 'git.checkout',
        summary: '在本 run 的工作区检出固定 commit，已忽略仓库 hook。',
        status: 'completed',
        input: `git clone --no-checkout\ngit checkout --detach ${task.commit}`,
        output: `data/runs/${task.id}/repo\nHEAD ${sha}`,
        durationMs: 820,
      }),
    }),
    pause(140, { type: 'step', stepId: 'prepare', status: 'completed', detail: '已检出固定 commit' }),
    pause(220, { type: 'step', stepId: 'index', status: 'running', detail: '正在解析 Go AST' }),
    pause(800, {
      type: 'event',
      event: ev('index', {
        key: 'ast',
        kind: 'tool',
        name: 'IndexRepository',
        summary: '写入函数、类型、文件和调用名。',
        status: 'completed',
        output: 'functions: 2\ntypes: 2\ncalls: CreateOrder → DeductStock',
        durationMs: 1100,
      }),
    }),
    pause(140, { type: 'step', stepId: 'index', status: 'completed', detail: '本 run 的索引已写入' }),
    pause(240, { type: 'step', stepId: 'analyze', status: 'running', detail: '模型正在选择下一个符号' }),
    pause(200, { type: 'summary', text: '正在根据问题选择要读的符号，还没有形成报告。' }),
    pause(500, {
      type: 'event',
      event: ev('analyze', {
        key: 'list',
        kind: 'tool',
        name: 'list_repo_files',
        summary: '列出 internal/order 下的 Go 文件。',
        status: 'completed',
        input: 'dir: internal/order',
        output: 'service.go\nrepository.go\ntypes.go\nservice_test.go',
        durationMs: 90,
      }),
    }),
    pause(120, { type: 'budget', toolCalls: 1, modelCalls: 1 }),
    pause(450, {
      type: 'event',
      event: ev('analyze', {
        key: 'symbol',
        kind: 'tool',
        name: 'get_symbol',
        summary: '读取 CreateOrder 的定义。',
        status: 'completed',
        input: 'symbol: OrderService.CreateOrder',
        output: serviceCode,
        durationMs: 140,
      }),
    }),
    pause(100, { type: 'file', file: serviceFile }),
    pause(100, { type: 'budget', toolCalls: 2 }),
    pause(450, {
      type: 'event',
      event: ev('analyze', {
        key: 'refs',
        kind: 'tool',
        name: 'find_references',
        summary: '查找 DeductStock 的调用方。',
        status: 'completed',
        input: 'symbol: Repo.DeductStock',
        output: 'internal/order/service.go:144 CreateOrder',
        durationMs: 160,
      }),
    }),
    pause(100, { type: 'file', file: stockFile }),
    pause(80, { type: 'budget', toolCalls: 3 }),
    pause(400, {
      type: 'event',
      event: ev('analyze', {
        key: 'read',
        kind: 'tool',
        name: 'read_file_range',
        summary: '读取库存更新的实现。',
        status: 'completed',
        input: 'path: internal/order/repository.go:88-93',
        output: repoCode,
        durationMs: 80,
      }),
    }),
    pause(80, { type: 'file', file: typeFile }),
    pause(80, { type: 'file', file: testFile }),
    pause(80, { type: 'budget', toolCalls: 4, modelCalls: 2 }),
    pause(160, { type: 'step', stepId: 'analyze', status: 'completed', detail: '证据已足够生成报告' }),
    pause(200, { type: 'step', stepId: 'report', status: 'running', detail: '正在核对行号' }),
    ...orderClaims.map((claim) => pause(80, { type: 'claim', claim })),
    pause(160, {
      type: 'summary',
      text: '库存扣减发生在 Repo.DeductStock。CreateOrder 在插入订单前调用它。类型和测试都在 internal/order，行号已对上本 run 的索引。',
    }),
    pause(120, {
      type: 'event',
      event: ev('report', {
        key: 'report',
        kind: 'decision',
        name: '报告',
        summary: '保留能对上索引的结论。',
        status: 'completed',
        output: `保留 ${orderClaims.length} 条。无法对上索引的句子：0。`,
      }),
    }),
    pause(100, { type: 'step', stepId: 'report', status: 'completed', detail: '报告已生成' }),
    pause(80, { type: 'status', status: 'completed' }),
  ]
}

export function planReview(task: Task): SimAction[] {
  const sha = shortSha(task.commit)
  const actions: SimAction[] = [
    pause(240, { type: 'step', stepId: 'validate', status: 'running', detail: '正在校验安装权限和去重键' }),
    pause(400, {
      type: 'event',
      event: ev('validate', {
        key: 'dedupe',
        kind: 'status',
        name: 'Webhook',
        summary: `仓库、PR #${task.pr?.number ?? ''} 和 head ${sha} 还没有评论过。`,
        status: 'completed',
      }),
    }),
    pause(100, { type: 'step', stepId: 'validate', status: 'completed', detail: '通过，未重复' }),
    pause(200, { type: 'step', stepId: 'prepare', status: 'running', detail: `正在检出 ${sha}` }),
    pause(650, {
      type: 'event',
      event: ev('prepare', {
        key: 'diff',
        kind: 'tool',
        name: 'git.diff',
        summary: '已计算 base...head。',
        status: 'completed',
        input: `git diff ${task.pr?.baseSha.slice(0, 7)}...${sha}`,
        output: 'internal/order/repository.go',
        durationMs: 540,
      }),
    }),
    pause(80, { type: 'diff', files: [prDiff] }),
    pause(100, { type: 'step', stepId: 'prepare', status: 'completed', detail: '已截出变更' }),
    pause(180, { type: 'step', stepId: 'index', status: 'running', detail: '只索引变更包和调用方' }),
    pause(500, {
      type: 'event',
      event: ev('index', {
        key: 'pkg',
        kind: 'tool',
        name: 'IndexRepository',
        summary: '索引 internal/order，以及 DeductStock 的调用方。',
        status: 'completed',
        output: 'package: internal/order\ncaller: CreateOrder',
      }),
    }),
    pause(80, { type: 'file', file: stockFile }),
    pause(80, { type: 'step', stepId: 'index', status: 'completed', detail: '变更包已索引' }),
    pause(180, { type: 'step', stepId: 'scan', status: 'running', detail: '正在按固定命令扫描' }),
  ]
  SCANNERS.forEach((scanner, index) => {
    actions.push(
      pause(index === 0 ? 300 : 450, {
        type: 'event',
        event: ev('scan', {
          key: scanner.id,
          kind: 'scanner',
          name: scanner.label,
          summary: index < 2 ? `${scanner.command} 完成。` : `${scanner.command} 有发现。`,
          status: 'completed',
          input: scanner.command,
          output: index === 2 ? 'G202 repository.go:89' : index === 1 ? 'SA1019 repository.go:90\nSA4006 service.go:20' : 'no issues',
          durationMs: 700 + index * 200,
        }),
      }),
    )
  })
  reviewFindings.forEach((finding) => actions.push(pause(80, { type: 'finding', finding })))
  actions.push(
    pause(120, { type: 'step', stepId: 'scan', status: 'completed', detail: '四个扫描器已跑完' }),
    pause(180, { type: 'step', stepId: 'review', status: 'running', detail: '正在丢掉不在 diff 上的意见' }),
    pause(500, {
      type: 'event',
      event: ev('review', {
        key: 'draft',
        kind: 'decision',
        name: '评论草稿',
        summary: '每条保留的意见都有文件、行号、规则编号和扫描输出。',
        status: 'completed',
        output: 'published: G202, SA1019\ndropped: SA4006 不在 diff',
      }),
    }),
    pause(80, { type: 'budget', toolCalls: 2, modelCalls: 1 }),
    pause(100, {
      type: 'summary',
      text: '本次 diff 把库存更新改成了拼接 SQL。gosec G202 和 staticcheck SA1019 落在变更行上。SA4006 不在 diff 里，没有写成评论。',
    }),
    pause(80, { type: 'step', stepId: 'review', status: 'completed', detail: '草稿已过滤' }),
    pause(180, { type: 'step', stepId: 'comment', status: 'running', detail: '正在发表评论型 review' }),
    pause(450, {
      type: 'event',
      event: ev('comment', {
        key: 'github',
        kind: 'status',
        name: 'GitHub Review',
        summary: '已发表评论，并标记 Check Run 完成。没有批准，没有合并，没有推送。',
        status: 'completed',
      }),
    }),
    pause(80, { type: 'step', stepId: 'comment', status: 'completed', detail: '评论已发表' }),
    pause(80, { type: 'status', status: 'commented', commentPosted: true }),
  )
  return actions
}

export function planContinuation(task: Task): SimAction[] {
  if (task.id !== 'RP-2008') return []
  return [
    pause(300, {
      type: 'event',
      event: ev('analyze', {
        key: 'resume',
        kind: 'status',
        name: '事件流',
        summary: '已按 run_id 继续。检出和索引没有重做。',
        status: 'completed',
      }),
    }),
    pause(400, {
      type: 'event',
      event: ev('analyze', {
        key: 'pool',
        kind: 'tool',
        name: 'get_symbol',
        summary: '读取 NewPool。',
        status: 'completed',
        input: 'symbol: NewPool',
        output: 'internal/db/pool.go:24',
        durationMs: 120,
      }),
    }),
    pause(120, {
      type: 'claim',
      claim: {
        id: 'pool',
        kind: 'function',
        symbol: 'NewPool',
        text: '连接池在 NewPool 创建。',
        path: 'internal/db/pool.go',
        line: 24,
      },
    }),
    pause(100, { type: 'summary', text: '连接池由 NewPool 创建。调用方索引在重连后补齐。' }),
    pause(80, { type: 'step', stepId: 'analyze', status: 'completed', detail: '证据已足够' }),
    pause(80, { type: 'step', stepId: 'report', status: 'completed', detail: '报告已生成' }),
    pause(80, { type: 'status', status: 'completed' }),
  ]
}

