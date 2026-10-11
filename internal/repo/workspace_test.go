package repo

import (
	"path/filepath"
	"testing"
)

func TestWorkspacePath(t *testing.T) {
	got, err := WorkspacePath("data", "run_1")
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join("data", "runs", "run_1", "repo")
	if got != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}

func TestWorkspacePathRejectsEscape(t *testing.T) {
	for _, id := range []string{"", "..", "../x", "a/b", `a\b`, "run id"} {
		if _, err := WorkspacePath("data", id); err == nil {
			t.Fatalf("run id %q was accepted", id)
		}
	}
}
