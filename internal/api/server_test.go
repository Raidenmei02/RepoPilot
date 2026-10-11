package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"repopilot/internal/github"
	"repopilot/internal/storage"
	"repopilot/internal/workflow"
)

func TestRoutes(t *testing.T) {
	srv, err := NewServer(Deps{
		Store:  storage.NewPostgres(""),
		Submit: workflow.NewSubmitter(workflow.SubmitDeps{}),
		GitHub: github.Unimplemented{},
		Env:    "dev",
	})
	if err != nil {
		t.Fatal(err)
	}

	cases := []struct {
		method string
		path   string
		body   string
		want   int
	}{
		{method: http.MethodGet, path: "/healthz", want: http.StatusOK},
		{method: http.MethodPost, path: "/api/v1/runs", body: `{"repo":"https://example.com/r.git","question":"怎么工作","ref":"main"}`, want: http.StatusNotImplemented},
		{method: http.MethodPost, path: "/api/v1/runs", body: `{}`, want: http.StatusBadRequest},
		{method: http.MethodGet, path: "/api/v1/runs/run_1", want: http.StatusNotImplemented},
		{method: http.MethodGet, path: "/api/v1/runs/run_1/events", want: http.StatusNotImplemented},
		{method: http.MethodGet, path: "/api/v1/runs/run_1/report", want: http.StatusNotImplemented},
		{method: http.MethodPost, path: "/api/v1/github/webhooks", body: `{}`, want: http.StatusNotImplemented},
	}
	for _, tc := range cases {
		req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		srv.Handler().ServeHTTP(rec, req)
		if rec.Code != tc.want {
			t.Errorf("%s %s = %d, want %d", tc.method, tc.path, rec.Code, tc.want)
		}
	}
}

func TestMissingDependency(t *testing.T) {
	if _, err := NewServer(Deps{}); err == nil {
		t.Fatal("expected missing dependency error")
	}
}
