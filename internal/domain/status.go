package domain

// Phase 是一步执行时任务应处于的状态。
// 分析：queued → preparing → indexing → analyzing → completed。
// 审核：queued → preparing → indexing → scanning → reviewing → commented。
// preparing 覆盖校验和检出；analyzing 覆盖只读检索和报告。
type Phase struct {
	Step   StepName
	Status RunStatus
}

func AnalyzePipeline() []Phase {
	return []Phase{
		{Step: StepValidate, Status: StatusPreparing},
		{Step: StepPrepare, Status: StatusPreparing},
		{Step: StepIndex, Status: StatusIndexing},
		{Step: StepAnalyze, Status: StatusAnalyzing},
		{Step: StepReport, Status: StatusAnalyzing},
	}
}

func ReviewPipeline() []Phase {
	return []Phase{
		{Step: StepValidate, Status: StatusPreparing},
		{Step: StepPrepare, Status: StatusPreparing},
		{Step: StepIndex, Status: StatusIndexing},
		{Step: StepScan, Status: StatusScanning},
		{Step: StepReview, Status: StatusReviewing},
		{Step: StepComment, Status: StatusReviewing},
	}
}

func sequence(kind RunKind) []RunStatus {
	switch kind {
	case KindAnalyze:
		return []RunStatus{StatusQueued, StatusPreparing, StatusIndexing, StatusAnalyzing, StatusCompleted}
	case KindReview:
		return []RunStatus{StatusQueued, StatusPreparing, StatusIndexing, StatusScanning, StatusReviewing, StatusCommented}
	default:
		return nil
	}
}

// Next 返回状态机中的下一个非终态转移。failed 和 cancelled 不在这条链上。
func Next(kind RunKind, current RunStatus) (RunStatus, bool) {
	seq := sequence(kind)
	for i := 0; i < len(seq)-1; i++ {
		if seq[i] == current {
			return seq[i+1], true
		}
	}
	return "", false
}

// CanTransit 判断一次条件更新是否合法。终态不能再转移。
// failed 和 cancelled 可以从任意非终态进入。
func CanTransit(kind RunKind, from, to RunStatus) bool {
	if from.Terminal() {
		return false
	}
	if to == StatusFailed || to == StatusCancelled {
		return true
	}
	next, ok := Next(kind, from)
	return ok && next == to
}
