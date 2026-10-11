// Package agent 只做两处局部判断：分析时选择下一个符号，审核时把工具结果写成评论。
// 第 2 周通过 Eino 调用模型，地址、密钥和模型名来自环境变量。
package agent

import (
	"context"

	"repopilot/internal/domain"
	"repopilot/internal/tools"
)

type Request struct {
	Model  string
	System string
	User   string
	Tools  []tools.Descriptor
}

type Response struct {
	Text string
}

type Client interface {
	Complete(ctx context.Context, req Request) (Response, error)
}

// EinoClient 是 Client 的计划实现，当前不导入 Eino。
type EinoClient struct {
	BaseURL string
	APIKey  string
	Model   string
}

func (c EinoClient) Complete(ctx context.Context, req Request) (Response, error) {
	return Response{}, domain.ErrNotImplemented
}

var _ Client = EinoClient{}
