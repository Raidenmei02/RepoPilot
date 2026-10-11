// Package api 用 Gin 暴露分析任务、事件流、报告和 GitHub webhook。
package api

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"repopilot/internal/github"
	"repopilot/internal/storage"
	"repopilot/internal/workflow"
)

type Deps struct {
	Store  storage.Store
	Submit workflow.Submitter
	GitHub github.Verifier
	Env    string
}

type Server struct {
	engine *gin.Engine
}

func NewServer(deps Deps) (*Server, error) {
	if deps.Store == nil || deps.Submit == nil || deps.GitHub == nil {
		return nil, errors.New("api: missing dependency")
	}
	if deps.Env == "dev" {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}
	h := &handler{store: deps.Store, submit: deps.Submit, github: deps.GitHub}
	engine := gin.New()
	engine.Use(gin.Logger(), gin.Recovery())
	engine.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	v1 := engine.Group("/api/v1")
	v1.POST("/runs", h.createRun)
	v1.GET("/runs/:id", h.getRun)
	v1.GET("/runs/:id/events", h.events)
	v1.GET("/runs/:id/report", h.report)
	v1.POST("/github/webhooks", h.webhook)
	return &Server{engine: engine}, nil
}

func (s *Server) Handler() http.Handler {
	return s.engine
}

func (s *Server) Run(addr string) error {
	return s.engine.Run(addr)
}
