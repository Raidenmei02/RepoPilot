package workflow

import (
	"context"

	"repopilot/internal/agent"
	"repopilot/internal/domain"
	"repopilot/internal/policy"
	"repopilot/internal/queue"
	"repopilot/internal/repo"
	"repopilot/internal/storage"
	"repopilot/internal/tools"
)

type AnalyzeDeps struct {
	Store   storage.Store
	Repo    repo.Preparer
	Index   repo.Indexer
	Tools   tools.Catalog
	Agent   agent.Client
	Policy  policy.Gate
	DataDir string
}

type Analyze struct {
	deps AnalyzeDeps
}

func NewAnalyze(deps AnalyzeDeps) *Analyze {
	return &Analyze{deps: deps}
}

var _ queue.Runner = (*Analyze)(nil)

// Run 执行分析流程，没有补丁节点和测试节点。
// 中断后按 run_steps 里已完成的步骤继续，不重复克隆。
func (a *Analyze) Run(ctx context.Context, runID string) error {
	return domain.ErrNotImplemented
}
