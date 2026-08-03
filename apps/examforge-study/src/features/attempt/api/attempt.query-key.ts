import type { GetAttemptsParams } from "../types/attempt.type"

export const ATTEMPT_HISTORY_PAGE_SIZE = 5

export function normalizeAttemptParams(params: GetAttemptsParams) {
	return {
		...(params.status ? { status: params.status } : {}),
		...(params.examId ? { examId: params.examId } : {}),
		...(params.sort ? { sort: params.sort } : {}),
		...(params.page != null ? { page: params.page } : {}),
		...(params.pageSize != null ? { pageSize: params.pageSize } : {}),
	}
}

export const attemptQueryKeys = {
	all: ["exam-attempts"] as const,
	lists: () => ["exam-attempts", "lists"] as const,
	list: (params: GetAttemptsParams) =>
		["exam-attempts", "lists", "page", normalizeAttemptParams(params)] as const,
	infinite: (params: GetAttemptsParams) =>
		["exam-attempts", "lists", "infinite", normalizeAttemptParams(params)] as const,
	detail: (attemptId: string) => ["exam-attempts", "detail", attemptId] as const,
}
