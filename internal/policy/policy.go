// Package policy 检查仓库是否在允许名单内，以及路径是否留在工作区内。
package policy

import (
	"context"

	"repopilot/internal/domain"
)

type Gate interface {
	AllowRepository(ctx context.Context, repo string) error
}

type Allowlist struct{}

func NewAllowlist() *Allowlist {
	return &Allowlist{}
}

func (a *Allowlist) AllowRepository(ctx context.Context, repo string) error {
	return domain.ErrNotImplemented
}

var _ Gate = (*Allowlist)(nil)

// CheckPath 确认 target 解析后仍在 workspaceRoot 之内。
// 第 1 周实现；符号链接和 `..` 都不能逃出工作区。
func CheckPath(workspaceRoot, target string) error {
	return domain.ErrNotImplemented
}
