package api

type createRunRequest struct {
	Repo     string `json:"repo" binding:"required"`
	Question string `json:"question" binding:"required"`
	Ref      string `json:"ref" binding:"required"`
}

type createRunResponse struct {
	RunID string `json:"run_id"`
}

type stepView struct {
	Name     string `json:"name"`
	Status   string `json:"status"`
	Summary  string `json:"summary"`
	Duration int64  `json:"duration_ms"`
	Error    string `json:"error,omitempty"`
}

type runResponse struct {
	RunID  string     `json:"run_id"`
	Kind   string     `json:"kind"`
	Status string     `json:"status"`
	Steps  []stepView `json:"steps"`
	Error  string     `json:"error,omitempty"`
}

type claimView struct {
	Kind   string `json:"kind"`
	Symbol string `json:"symbol"`
	Text   string `json:"text"`
	Path   string `json:"path"`
	Line   int    `json:"line"`
}

type findingView struct {
	Path      string `json:"path"`
	Line      int    `json:"line"`
	Rule      string `json:"rule"`
	Severity  string `json:"severity"`
	Evidence  string `json:"evidence"`
	Published bool   `json:"published"`
}

type reportResponse struct {
	RunID    string        `json:"run_id"`
	Kind     string        `json:"kind"`
	Claims   []claimView   `json:"claims,omitempty"`
	Findings []findingView `json:"findings,omitempty"`
}
