package api

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"repopilot/internal/domain"
	"repopilot/internal/github"
	"repopilot/internal/storage"
	"repopilot/internal/workflow"
)

type handler struct {
	store  storage.Store
	submit workflow.Submitter
	github github.Verifier
}

func (h *handler) createRun(c *gin.Context) {
	var req createRunRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	runID, err := h.submit.CreateAnalyze(c.Request.Context(), workflow.AnalyzeInput{
		RepoURL:  req.Repo,
		Question: req.Question,
		Ref:      req.Ref,
	})
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusAccepted, createRunResponse{RunID: runID})
}

func (h *handler) getRun(c *gin.Context) {
	run, err := h.store.GetRun(c.Request.Context(), c.Param("id"))
	if err != nil {
		writeError(c, err)
		return
	}
	steps, err := h.store.ListSteps(c.Request.Context(), run.ID)
	if err != nil {
		writeError(c, err)
		return
	}
	view := runResponse{
		RunID:  run.ID,
		Kind:   string(run.Kind),
		Status: string(run.Status),
		Error:  run.Error,
		Steps:  make([]stepView, 0, len(steps)),
	}
	for _, step := range steps {
		view.Steps = append(view.Steps, stepView{
			Name:     string(step.Name),
			Status:   string(step.Status),
			Summary:  step.Summary,
			Duration: step.Duration.Milliseconds(),
			Error:    step.Error,
		})
	}
	c.JSON(http.StatusOK, view)
}

// events 先推已有步骤，再轮询新步骤。实现后响应为 text/event-stream。
func (h *handler) events(c *gin.Context) {
	writeError(c, domain.ErrNotImplemented)
}

func (h *handler) report(c *gin.Context) {
	if _, err := h.store.GetRun(c.Request.Context(), c.Param("id")); err != nil {
		writeError(c, err)
		return
	}
	writeError(c, domain.ErrNotImplemented)
}

func (h *handler) webhook(c *gin.Context) {
	body, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}
	event, err := h.github.Verify(c.Request.Header, body)
	if err != nil {
		writeError(c, err)
		return
	}
	if err := h.submit.AcceptPullRequest(c.Request.Context(), event); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusAccepted)
}

func writeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrNotImplemented):
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	case errors.Is(err, domain.ErrConflict):
		c.JSON(http.StatusConflict, gin.H{"error": "conflict"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal"})
	}
}
