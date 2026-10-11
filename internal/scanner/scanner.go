// Package scanner 用固定扫描器产生发现。模型不能改命令参数。
// 第 4 周前 Scan 在本机执行；之后改为 sandbox.Runner。
package scanner

import (
	"context"

	"repopilot/internal/domain"
)

const (
	GoVet       = "go_vet"
	Staticcheck = "staticcheck"
	Gosec       = "gosec"
	Govulncheck = "govulncheck"
)

type Scanner interface {
	ID() string
	Scan(ctx context.Context, workspace string) ([]domain.Finding, error)
}

// Local 保留本机命令位置。Argv 是固定参数，没有 shell 字符串。
type Local struct {
	ScannerID string
	Argv      []string
}

func (l Local) ID() string { return l.ScannerID }

func (l Local) Scan(ctx context.Context, workspace string) ([]domain.Finding, error) {
	return nil, domain.ErrNotImplemented
}

var _ Scanner = Local{}

func Fixed() []Scanner {
	return []Scanner{
		Local{ScannerID: GoVet, Argv: []string{"go", "vet", "./..."}},
		Local{ScannerID: Staticcheck, Argv: []string{"staticcheck", "./..."}},
		Local{ScannerID: Gosec, Argv: []string{"gosec", "./..."}},
		Local{ScannerID: Govulncheck, Argv: []string{"govulncheck", "./..."}},
	}
}
