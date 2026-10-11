package workflow

import "context"

// Patcher 留给后续版本。第一版没有按自然语言修 Bug、写功能或自动开 Pull Request 的节点。
type Patcher interface {
	ProposePatch(ctx context.Context, runID string) error
}
