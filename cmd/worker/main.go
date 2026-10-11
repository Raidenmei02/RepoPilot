package main

import (
	"log"

	"repopilot/internal/agent"
	"repopilot/internal/config"
	"repopilot/internal/github"
	"repopilot/internal/policy"
	"repopilot/internal/queue"
	"repopilot/internal/repo"
	"repopilot/internal/scanner"
	"repopilot/internal/storage"
	"repopilot/internal/tools"
	"repopilot/internal/workflow"
)

func main() {
	cfg := config.Load()
	store := storage.NewPostgres(cfg.DatabaseURL)
	model := agent.EinoClient{
		BaseURL: cfg.ModelBaseURL,
		APIKey:  cfg.ModelAPIKey,
		Model:   cfg.ModelName,
	}
	analyze := workflow.NewAnalyze(workflow.AnalyzeDeps{
		Store:   store,
		Repo:    repo.Git{},
		Index:   repo.ASTIndex{},
		Tools:   tools.ReadonlyCatalog{Limit: cfg.ToolCallLimit},
		Agent:   model,
		Policy:  policy.NewAllowlist(),
		DataDir: cfg.DataDir,
	})
	review := workflow.NewReview(workflow.ReviewDeps{
		Store:     store,
		Repo:      repo.Git{},
		Index:     repo.ASTIndex{},
		Scanners:  scanner.Fixed(),
		Agent:     model,
		Publisher: github.Unimplemented{},
		DataDir:   cfg.DataDir,
	})

	log.Printf("worker listening on redis %s", cfg.RedisAddr)
	if err := queue.NewServer(cfg.RedisAddr).Run(analyze, review); err != nil {
		log.Fatal(err)
	}
}
