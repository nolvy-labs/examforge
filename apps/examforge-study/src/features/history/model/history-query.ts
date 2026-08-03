import type { AttemptStatus } from "@/features/attempt/types/attempt.type"

const HISTORY_KEYS = ["status", "page", "pageSize"] as const
export const HISTORY_PAGE_SIZES = [10, 20, 50] as const

export interface HistoryState {
	status?: AttemptStatus
	page: number
	pageSize: (typeof HISTORY_PAGE_SIZES)[number]
}

function parsePositiveInteger(value: string | null, fallback: number) {
	if (!value || !/^\d+$/.test(value)) return fallback
	const parsed = Number(value)
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function parseHistoryQuery(params: URLSearchParams): HistoryState {
	const rawStatus = params.get("status")
	const status =
		rawStatus === "in-progress" ||
		rawStatus === "submitted" ||
		rawStatus === "abandoned"
			? rawStatus
			: undefined
	const requestedPageSize = parsePositiveInteger(params.get("pageSize"), 10)
	const pageSize = HISTORY_PAGE_SIZES.includes(
		requestedPageSize as (typeof HISTORY_PAGE_SIZES)[number]
	)
		? (requestedPageSize as (typeof HISTORY_PAGE_SIZES)[number])
		: 10

	return {
		status,
		page: parsePositiveInteger(params.get("page"), 1),
		pageSize,
	}
}

export function serializeHistoryQuery(
	state: HistoryState,
	current?: URLSearchParams
) {
	const params = new URLSearchParams(current)
	for (const key of HISTORY_KEYS) params.delete(key)
	if (state.status) params.set("status", state.status)
	if (state.page !== 1) params.set("page", String(state.page))
	if (state.pageSize !== 10) params.set("pageSize", String(state.pageSize))
	return params
}

export function getNormalizedHistoryQuery(params: URLSearchParams) {
	return serializeHistoryQuery(parseHistoryQuery(params), params).toString()
}

export function updateHistoryState(
	state: HistoryState,
	patch: Partial<HistoryState>,
	resetPage = true
) {
	return {
		...state,
		...patch,
		page: resetPage ? 1 : (patch.page ?? state.page),
	}
}
