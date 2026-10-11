// Package storage 定义 PostgreSQL 持久化端口。查询实现留到任务系统那一周。
package storage

import (
	"context"

	"repopilot/internal/domain"
)

// Store 是 API 和 Worker 共享的状态端口。
// Transition 必须执行：
//
//	UPDATE task_runs SET status = $3, updated_at = now()
//	WHERE id = $1 AND status = $2
//
// 影响行数不是 1 时返回 domain.ErrConflict。
type Store interface {
	UpsertRepository(ctx context.Context, repo domain.Repository) error
	GetRepository(ctx context.Context, id string) (domain.Repository, error)

	CreateRun(ctx context.Context, run domain.TaskRun) error
	GetRun(ctx context.Context, id string) (domain.TaskRun, error)
	FindReviewRun(ctx context.Context, repositoryID string, prNumber int, headSHA string) (domain.TaskRun, error)
	Transition(ctx context.Context, id string, from, to domain.RunStatus) error

	InsertStep(ctx context.Context, step domain.RunStep) error
	ListSteps(ctx context.Context, runID string) ([]domain.RunStep, error)

	InsertToolCall(ctx context.Context, call domain.ToolCall) error
	InsertFinding(ctx context.Context, finding domain.Finding) error
	ListFindings(ctx context.Context, runID string) ([]domain.Finding, error)
	InsertArtifact(ctx context.Context, artifact domain.Artifact) error
	GetArtifact(ctx context.Context, runID string, kind domain.ArtifactKind) (domain.Artifact, error)
}
