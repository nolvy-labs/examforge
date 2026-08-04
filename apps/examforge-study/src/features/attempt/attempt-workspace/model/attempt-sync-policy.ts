import type { ExamAttemptMode } from "../../types/attempt.type"

export const PRACTICE_SYNC_WINDOW_MS = 120_000
export const EXAM_SYNC_DEBOUNCE_MS = 10_000
export const EXAM_MAX_DIRTY_WINDOW_MS = 60_000

export function getSyncDeadline(
	mode: ExamAttemptMode,
	firstDirtyAt: number,
	lastEditAt: number
) {
	return mode === "practice"
		? firstDirtyAt + PRACTICE_SYNC_WINDOW_MS
		: Math.min(
			lastEditAt + EXAM_SYNC_DEBOUNCE_MS,
			firstDirtyAt + EXAM_MAX_DIRTY_WINDOW_MS
		)
}
