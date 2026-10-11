// Package sandbox 在无网络容器里执行固定命令。不挂 Docker socket，不传入密钥。
package sandbox

import (
	"context"
	"errors"
	"time"

	"repopilot/internal/domain"
)

type Command struct {
	Name string
	Argv []string
	Dir  string
}

type Limits struct {
	MemoryMB int
	CPUs     float64
	PIDs     int
	Timeout  time.Duration
}

type Spec struct {
	Command           Command
	Limits            Limits
	Network           bool
	MountDockerSocket bool
}

type Result struct {
	ExitCode int
	Stdout   string
	Stderr   string
}

type Runner interface {
	Run(ctx context.Context, spec Spec) (Result, error)
}

type Unimplemented struct{}

var _ Runner = Unimplemented{}

func (Unimplemented) Run(ctx context.Context, spec Spec) (Result, error) {
	if spec.Network {
		return Result{}, errors.New("sandbox: network is disabled")
	}
	if spec.MountDockerSocket {
		return Result{}, errors.New("sandbox: docker socket is not available")
	}
	return Result{}, domain.ErrNotImplemented
}
