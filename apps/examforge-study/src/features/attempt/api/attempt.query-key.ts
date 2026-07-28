export const ATTEMPT_HISTORY_PAGE_SIZE = 5

export const attemptQueryKeys = {
	detail: (attemptId: string) => ["exam-attempt", attemptId] as const,
	activeForExam: (examId: string) => ["student-exam-attempts", examId, "in-progress", 1, 1] as const,
	historyForExam: (examId: string, page: number) => [
		"student-exam-attempts",
		examId,
		"completed",
		page,
		ATTEMPT_HISTORY_PAGE_SIZE,
	] as const,
	allForExam: (examId: string) => ["student-exam-attempts", examId] as const,
}
