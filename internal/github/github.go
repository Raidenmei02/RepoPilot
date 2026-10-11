// Package github 接收 Pull Request webhook，并发表评论型 review。
// 这里没有批准、合并或推送方法。
package github

import (
	"context"
	"net/http"

	"repopilot/internal/domain"
)

type PullRequestEvent struct {
	Repository string
	Number     int
	BaseRef    string
	HeadRef    string
	BaseSHA    string
	HeadSHA    string
	Action     string
}

type Verifier interface {
	Verify(header http.Header, body []byte) (PullRequestEvent, error)
}

type Comment struct {
	Path     string
	Line     int
	Rule     string
	Evidence string
	Body     string
}

type Publisher interface {
	PublishReview(ctx context.Context, repo string, pr int, headSHA string, comments []Comment) error
	CompleteCheckRun(ctx context.Context, repo, headSHA string) error
}

type Unimplemented struct{}

func (Unimplemented) Verify(header http.Header, body []byte) (PullRequestEvent, error) {
	return PullRequestEvent{}, domain.ErrNotImplemented
}

func (Unimplemented) PublishReview(ctx context.Context, repo string, pr int, headSHA string, comments []Comment) error {
	return domain.ErrNotImplemented
}

func (Unimplemented) CompleteCheckRun(ctx context.Context, repo, headSHA string) error {
	return domain.ErrNotImplemented
}

var (
	_ Verifier  = Unimplemented{}
	_ Publisher = Unimplemented{}
)
