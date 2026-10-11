package workflow

import (
	"context"

	"repopilot/internal/agent"
	"repopilot/internal/domain"
	"repopilot/internal/github"
	"repopilot/internal/queue"
	"repopilot/internal/repo"
	"repopilot/internal/scanner"
	"repopilot/internal/storage"
)

type ReviewDeps struct {
	Store     storage.Store
	Repo      repo.Preparer
	Index     repo.Indexer
	Scanners  []scanner.Scanner
	Agent     agent.Client
	Publisher github.Publisher
	DataDir   string
}

type Review struct {
	deps ReviewDeps
}

func NewReview(deps ReviewDeps) *Review {
	return &Review{deps: deps}
}

var _ queue.Runner = (*Review)(nil)

// Run 执行审核流程。评论只落在 diff 行上，同一 head SHA 已评论过则不再发表。
func (r *Review) Run(ctx context.Context, runID string) error {
	return domain.ErrNotImplemented
}
