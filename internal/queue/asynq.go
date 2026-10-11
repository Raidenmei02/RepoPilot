package queue

import (
	"context"
	"errors"
	"fmt"

	"github.com/hibiken/asynq"

	"repopilot/internal/domain"
)

// Enqueuer 只投递 run_id。任务体不携带仓库凭据或模型密钥。
type Enqueuer interface {
	Enqueue(ctx context.Context, taskType, runID string) error
}

type Asynq struct {
	client *asynq.Client
}

func NewAsynq(redisAddr string) *Asynq {
	return &Asynq{client: asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr})}
}

func (a *Asynq) Enqueue(ctx context.Context, taskType, runID string) error {
	body, err := MarshalRun(runID)
	if err != nil {
		return err
	}
	_, err = a.client.EnqueueContext(ctx, asynq.NewTask(taskType, body))
	return err
}

func (a *Asynq) Close() error {
	return a.client.Close()
}

var _ Enqueuer = (*Asynq)(nil)

// Runner 由 workflow 实现。队列适配层只负责解码 run_id。
type Runner interface {
	Run(ctx context.Context, runID string) error
}

type Server struct {
	srv *asynq.Server
}

func NewServer(redisAddr string) *Server {
	return &Server{srv: asynq.NewServer(asynq.RedisClientOpt{Addr: redisAddr}, asynq.Config{Concurrency: 4})}
}

func (s *Server) Run(analyze, review Runner) error {
	mux := asynq.NewServeMux()
	mux.HandleFunc(TypeAnalyze, handle(analyze))
	mux.HandleFunc(TypeReview, handle(review))
	return s.srv.Run(mux)
}

func handle(runner Runner) func(context.Context, *asynq.Task) error {
	return func(ctx context.Context, task *asynq.Task) error {
		payload, err := UnmarshalRun(task.Payload())
		if err != nil {
			return fmt.Errorf("decode payload: %w: %w", err, asynq.SkipRetry)
		}
		if err = runner.Run(ctx, payload.RunID); err != nil {
			if errors.Is(err, domain.ErrNotImplemented) {
				return fmt.Errorf("%w: %w", err, asynq.SkipRetry)
			}
			return err
		}
		return nil
	}
}
