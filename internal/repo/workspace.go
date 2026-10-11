// Package repo 负责检出固定 commit，并用 Go AST 建立符号和调用关系。
package repo

import (
	"context"
	"errors"
	"path/filepath"
	"unicode"

	"repopilot/internal/domain"
)

// WorkspacePath 返回 data/runs/<run_id>/repo。run_id 只允许字母、数字、连字符和下划线。
func WorkspacePath(dataDir, runID string) (string, error) {
	if dataDir == "" {
		return "", errors.New("repo: empty data dir")
	}
	if !validRunID(runID) {
		return "", errors.New("repo: invalid run id")
	}
	return filepath.Join(dataDir, "runs", runID, "repo"), nil
}

func validRunID(id string) bool {
	if id == "" || len(id) > 128 {
		return false
	}
	for _, r := range id {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '-' || r == '_' {
			continue
		}
		return false
	}
	return true
}

// Preparer 检出固定 commit。实现时使用 git clone --no-checkout 和 checkout --detach，并忽略仓库 hook。
type Preparer interface {
	Prepare(ctx context.Context, spec PrepareSpec) (Workspace, error)
}

type PrepareSpec struct {
	RunID    string
	DataDir  string
	CloneURL string
	SHA      string
}

type Workspace struct {
	RunID string
	Root  string
	SHA   string
}

type Git struct{}

func (g Git) Prepare(ctx context.Context, spec PrepareSpec) (Workspace, error) {
	return Workspace{}, domain.ErrNotImplemented
}

type SymbolKind string

const (
	SymbolFunc SymbolKind = "func"
	SymbolType SymbolKind = "type"
)

type Symbol struct {
	Name string
	Kind SymbolKind
	File string
	Line int
}

type Indexer interface {
	IndexRepository(ctx context.Context, ws Workspace) error
	IndexChanged(ctx context.Context, ws Workspace, files []string) error
	FindSymbol(ctx context.Context, runID, name string) (Symbol, error)
	Callers(ctx context.Context, runID, name string) ([]Symbol, error)
}

type ASTIndex struct{}

func (a ASTIndex) IndexRepository(ctx context.Context, ws Workspace) error {
	return domain.ErrNotImplemented
}

func (a ASTIndex) IndexChanged(ctx context.Context, ws Workspace, files []string) error {
	return domain.ErrNotImplemented
}

func (a ASTIndex) FindSymbol(ctx context.Context, runID, name string) (Symbol, error) {
	return Symbol{}, domain.ErrNotImplemented
}

func (a ASTIndex) Callers(ctx context.Context, runID, name string) ([]Symbol, error) {
	return nil, domain.ErrNotImplemented
}

var (
	_ Preparer = Git{}
	_ Indexer  = ASTIndex{}
)
