package domain

import "testing"

func TestAnalyzeSequence(t *testing.T) {
	current := StatusQueued
	for _, want := range []RunStatus{StatusPreparing, StatusIndexing, StatusAnalyzing, StatusCompleted} {
		next, ok := Next(KindAnalyze, current)
		if !ok || next != want {
			t.Fatalf("Next(analyze, %s) = %s, %v; want %s", current, next, ok, want)
		}
		if !CanTransit(KindAnalyze, current, next) {
			t.Fatalf("CanTransit(analyze, %s, %s) = false", current, next)
		}
		current = next
	}
	if _, ok := Next(KindAnalyze, StatusCompleted); ok {
		t.Fatal("completed has no next status")
	}
	if CanTransit(KindAnalyze, StatusCompleted, StatusFailed) {
		t.Fatal("terminal status must not move to failed")
	}
}

func TestReviewSequence(t *testing.T) {
	current := StatusQueued
	for _, want := range []RunStatus{StatusPreparing, StatusIndexing, StatusScanning, StatusReviewing, StatusCommented} {
		next, ok := Next(KindReview, current)
		if !ok || next != want {
			t.Fatalf("Next(review, %s) = %s, %v; want %s", current, next, ok, want)
		}
		current = next
	}
}

func TestCancelFromNonTerminal(t *testing.T) {
	if !CanTransit(KindAnalyze, StatusIndexing, StatusCancelled) {
		t.Fatal("indexing can be cancelled")
	}
	if CanTransit(KindReview, StatusScanning, StatusCompleted) {
		t.Fatal("review must not complete as an analyze run")
	}
}

func TestPipelinesCoverDeclaredSteps(t *testing.T) {
	analyze := map[StepName]bool{}
	for _, phase := range AnalyzePipeline() {
		analyze[phase.Step] = true
	}
	for _, step := range []StepName{StepValidate, StepPrepare, StepIndex, StepAnalyze, StepReport} {
		if !analyze[step] {
			t.Fatalf("analyze pipeline missing %s", step)
		}
	}
	if analyze[StepScan] || analyze[StepComment] {
		t.Fatal("analyze pipeline includes review-only steps")
	}
}
