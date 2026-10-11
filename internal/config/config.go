// Package config 从环境变量读取进程配置。密钥只保存在配置里，不写入任务或容器。
package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Env                 string
	HTTPAddr            string
	DatabaseURL         string
	RedisAddr           string
	DataDir             string
	ModelBaseURL        string
	ModelAPIKey         string
	ModelName           string
	PromptVersion       string
	GitHubWebhookSecret string
	GitHubAppID         string
	ToolCallLimit       int
	RunTimeout          time.Duration
}

func Load() Config {
	return Config{
		Env:                 env("ENV", "dev"),
		HTTPAddr:            env("HTTP_ADDR", ":8080"),
		DatabaseURL:         env("DATABASE_URL", "postgres://repopilot:repopilot@127.0.0.1:5432/repopilot?sslmode=disable"),
		RedisAddr:           env("REDIS_ADDR", "127.0.0.1:6379"),
		DataDir:             env("DATA_DIR", "data"),
		ModelBaseURL:        env("MODEL_BASE_URL", ""),
		ModelAPIKey:         env("MODEL_API_KEY", ""),
		ModelName:           env("MODEL_NAME", ""),
		PromptVersion:       env("PROMPT_VERSION", "v1"),
		GitHubWebhookSecret: env("GITHUB_WEBHOOK_SECRET", ""),
		GitHubAppID:         env("GITHUB_APP_ID", ""),
		ToolCallLimit:       envInt("TOOL_CALL_LIMIT", 20),
		RunTimeout:          envDuration("RUN_TIMEOUT", 10*time.Minute),
	}
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func envDuration(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return fallback
	}
	return d
}
