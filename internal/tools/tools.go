// Package tools 是分析阶段的五个只读工具。模型不能执行命令。
package tools

import (
	"context"

	"repopilot/internal/domain"
)

const (
	ListRepoFiles  = "list_repo_files"
	SearchCode     = "search_code"
	GetSymbol      = "get_symbol"
	FindReferences = "find_references"
	ReadFileRange  = "read_file_range"
)

type Descriptor struct {
	Name   string
	Detail string
}

func Readonly() []Descriptor {
	return []Descriptor{
		{Name: ListRepoFiles, Detail: "列出工作区内的文件"},
		{Name: SearchCode, Detail: "在索引和文本里检索"},
		{Name: GetSymbol, Detail: "按名字读取函数或类型"},
		{Name: FindReferences, Detail: "查找调用方"},
		{Name: ReadFileRange, Detail: "读取文件中的一段行"},
	}
}

type Request struct {
	Name string
	Args map[string]any
}

type Result struct {
	Summary string
	Body    string
}

// Catalog 执行只读工具。实现时必须检查次数上限，并拒绝工作区外的路径。
type Catalog interface {
	Call(ctx context.Context, runID string, req Request) (Result, error)
}

type ReadonlyCatalog struct {
	Limit int
}

func (c ReadonlyCatalog) Call(ctx context.Context, runID string, req Request) (Result, error) {
	return Result{}, domain.ErrNotImplemented
}

var _ Catalog = ReadonlyCatalog{}
