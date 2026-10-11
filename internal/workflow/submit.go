// Package workflow 串起分析和审核两条流程。步骤体留空，恢复和去重留到后续周次。
package workflow

import (
	"context"

	"repopilot/internal/domain"
	"repopilot/internal/github"
	"repopilot/internal/policy"
	"repopilot/internal/queue"
	"repopilot/internal/storage"
)

type AnalyzeInput struct {
	RepoURL  string
	Question string
	Ref      string
}

type Submitter interface {
	CreateAnalyze(ctx context.Context, in AnalyzeInput) (string, error)
	AcceptPullRequest(ctx context.Context, event github.PullRequestEvent) error
}

type SubmitDeps struct {
	Store  storage.Store
	Queue  queue.Enqueuer
	Policy policy.Gate
}

type Submit struct {
	deps SubmitDeps
}

func NewSubmitter(deps SubmitDeps) *Submit {
	return &Submit{deps: deps}
}

var _ Submitter = (*Submit)(nil)

// CreateAnalyze 第 3 周按这个顺序实现：允许名单、写入 queued、投递 run:analyze。
func (s *Submit) CreateAnalyze(ctx context.Context, in AnalyzeInput) (string, error) {
	return "", domain.ErrNotImplemented
}

// AcceptPullRequest 第 5 周按这个顺序实现：安装权限、仓库名单、仓库+PR+head SHA 去重、入队。
func (s *Submit) AcceptPullRequest(ctx context.Context, event github.PullRequestEvent) error {
	return domain.ErrNotImplemented
}
