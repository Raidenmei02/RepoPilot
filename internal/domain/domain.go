// Package domain 存放任务、发现和报告的共享类型。
package domain

import (
	"errors"
	"time"
)

var (
	ErrNotImplemented = errors.New("not implemented")
	ErrConflict       = errors.New("status conflict")
)

type RunKind string

const (
	KindAnalyze RunKind = "analyze"
	KindReview  RunKind = "review"
)

type RunStatus string

const (
	StatusQueued    RunStatus = "queued"
	StatusPreparing RunStatus = "preparing"
	StatusIndexing  RunStatus = "indexing"
	StatusAnalyzing RunStatus = "analyzing"
	StatusScanning  RunStatus = "scanning"
	StatusReviewing RunStatus = "reviewing"
	StatusCompleted RunStatus = "completed"
	StatusCommented RunStatus = "commented"
	StatusFailed    RunStatus = "failed"
	StatusCancelled RunStatus = "cancelled"
)

func (s RunStatus) Terminal() bool {
	switch s {
	case StatusCompleted, StatusCommented, StatusFailed, StatusCancelled:
		return true
	default:
		return false
	}
}

type StepName string

const (
	StepValidate StepName = "validate"
	StepPrepare  StepName = "prepare"
	StepIndex    StepName = "index"
	StepAnalyze  StepName = "analyze"
	StepReport   StepName = "report"
	StepScan     StepName = "scan"
	StepReview   StepName = "review"
	StepComment  StepName = "comment"
)

type StepStatus string

const (
	StepPending   StepStatus = "pending"
	StepRunning   StepStatus = "running"
	StepCompleted StepStatus = "completed"
	StepFailed    StepStatus = "failed"
	StepSkipped   StepStatus = "skipped"
	StepCancelled StepStatus = "cancelled"
)

type Severity string

const (
	SeverityInfo    Severity = "info"
	SeverityWarning Severity = "warning"
	SeverityError   Severity = "error"
)

type ArtifactKind string

const (
	ArtifactReport     ArtifactKind = "report"
	ArtifactDiff       ArtifactKind = "diff"
	ArtifactScanOutput ArtifactKind = "scan_output"
)

type Budget struct {
	ToolCallLimit int           `json:"tool_call_limit"`
	ToolCalls     int           `json:"tool_calls"`
	ModelCalls    int           `json:"model_calls"`
	Timeout       time.Duration `json:"timeout"`
}

type RetrievalConfig struct {
	MaxToolCalls int `json:"max_tool_calls"`
	MaxFiles     int `json:"max_files"`
}

type Repository struct {
	ID                   string
	Owner                string
	Name                 string
	CloneURL             string
	Language             string
	DefaultBranch        string
	GitHubInstallationID int64
	Allowed              bool
}

type TaskRun struct {
	ID            string
	Kind          RunKind
	RepositoryID  string
	Status        RunStatus
	Question      string
	PRNumber      *int
	BaseSHA       string
	HeadSHA       string
	CommitSHA     string
	ModelName     string
	PromptVersion string
	Retrieval     RetrievalConfig
	Budget        Budget
	Error         string
	CommentPosted bool
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type RunStep struct {
	ID       string
	RunID    string
	Name     StepName
	Status   StepStatus
	Summary  string
	Duration time.Duration
	Error    string
}

type ToolCall struct {
	ID      string
	RunID   string
	Name    string
	Args    []byte
	Summary string
}

type Finding struct {
	ID        string
	RunID     string
	Path      string
	Line      int
	Rule      string
	Severity  Severity
	Evidence  string
	Published bool
}

type Artifact struct {
	ID    string
	RunID string
	Kind  ArtifactKind
	Body  string
}

type ClaimKind string

const (
	ClaimFunction ClaimKind = "function"
	ClaimType     ClaimKind = "type"
	ClaimCaller   ClaimKind = "caller"
	ClaimTest     ClaimKind = "test"
)

// Claim 是分析报告中的一条结论。Path 和 Line 必须能在该 run 的索引里查到。
type Claim struct {
	Kind   ClaimKind
	Symbol string
	Text   string
	Path   string
	Line   int
}
