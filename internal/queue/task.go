// Package queue 用 Asynq 把分析任务和审核任务放进 Redis。
package queue

import "encoding/json"

const (
	TypeAnalyze = "run:analyze"
	TypeReview  = "run:review"
)

type RunPayload struct {
	RunID string `json:"run_id"`
}

func MarshalRun(runID string) ([]byte, error) {
	return json.Marshal(RunPayload{RunID: runID})
}

func UnmarshalRun(body []byte) (RunPayload, error) {
	var payload RunPayload
	err := json.Unmarshal(body, &payload)
	return payload, err
}
