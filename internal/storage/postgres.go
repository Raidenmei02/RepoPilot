package storage

import (
	"context"

	"repopilot/internal/domain"
)

// Postgres 是 Store 的计划实现。当前方法不连接数据库。
type Postgres struct {
	DSN string
}

func NewPostgres(dsn string) *Postgres {
	return &Postgres{DSN: dsn}
}

func (p *Postgres) UpsertRepository(ctx context.Context, repo domain.Repository) error {
	return domain.ErrNotImplemented
}

func (p *Postgres) GetRepository(ctx context.Context, id string) (domain.Repository, error) {
	return domain.Repository{}, domain.ErrNotImplemented
}

func (p *Postgres) CreateRun(ctx context.Context, run domain.TaskRun) error {
	return domain.ErrNotImplemented
}

func (p *Postgres) GetRun(ctx context.Context, id string) (domain.TaskRun, error) {
	return domain.TaskRun{}, domain.ErrNotImplemented
}

func (p *Postgres) FindReviewRun(ctx context.Context, repositoryID string, prNumber int, headSHA string) (domain.TaskRun, error) {
	return domain.TaskRun{}, domain.ErrNotImplemented
}

func (p *Postgres) Transition(ctx context.Context, id string, from, to domain.RunStatus) error {
	return domain.ErrNotImplemented
}

func (p *Postgres) InsertStep(ctx context.Context, step domain.RunStep) error {
	return domain.ErrNotImplemented
}

func (p *Postgres) ListSteps(ctx context.Context, runID string) ([]domain.RunStep, error) {
	return nil, domain.ErrNotImplemented
}

func (p *Postgres) InsertToolCall(ctx context.Context, call domain.ToolCall) error {
	return domain.ErrNotImplemented
}

func (p *Postgres) InsertFinding(ctx context.Context, finding domain.Finding) error {
	return domain.ErrNotImplemented
}

func (p *Postgres) ListFindings(ctx context.Context, runID string) ([]domain.Finding, error) {
	return nil, domain.ErrNotImplemented
}

func (p *Postgres) InsertArtifact(ctx context.Context, artifact domain.Artifact) error {
	return domain.ErrNotImplemented
}

func (p *Postgres) GetArtifact(ctx context.Context, runID string, kind domain.ArtifactKind) (domain.Artifact, error) {
	return domain.Artifact{}, domain.ErrNotImplemented
}

var _ Store = (*Postgres)(nil)
