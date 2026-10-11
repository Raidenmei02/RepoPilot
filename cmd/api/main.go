package main

import (
	"log"

	"repopilot/internal/api"
	"repopilot/internal/config"
	"repopilot/internal/github"
	"repopilot/internal/policy"
	"repopilot/internal/queue"
	"repopilot/internal/storage"
	"repopilot/internal/workflow"
)

func main() {
	cfg := config.Load()
	store := storage.NewPostgres(cfg.DatabaseURL)
	enqueuer := queue.NewAsynq(cfg.RedisAddr)
	defer enqueuer.Close()

	srv, err := api.NewServer(api.Deps{
		Store: store,
		Submit: workflow.NewSubmitter(workflow.SubmitDeps{
			Store:  store,
			Queue:  enqueuer,
			Policy: policy.NewAllowlist(),
		}),
		GitHub: github.Unimplemented{},
		Env:    cfg.Env,
	})
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("api listening on %s", cfg.HTTPAddr)
	if err := srv.Run(cfg.HTTPAddr); err != nil {
		log.Fatal(err)
	}
}
