import type { ExamBrowseSort, ExamBrowseState } from "./exam-browse.types"

export const EXAM_PAGE_SIZE = 12
const BROWSE_KEYS = ["q", "category", "tags", "sort", "page"] as const

function normalizeTagId(value: string) {
	return value.trim().toLowerCase()
}

function parsePage(value: string | null) {
	if (!value || !/^\d+$/.test(value)) return 1
	const page = Number(value)
	return Number.isSafeInteger(page) && page > 0 ? page : 1
}

export function parseExamBrowseParams(params: URLSearchParams): ExamBrowseState {
	const sort: ExamBrowseSort =
		params.get("sort")?.toLowerCase() === "oldest" ? "oldest" : "newest"
	const tagIds = Array.from(
		new Set(
			(params.get("tags") ?? "")
				.split(",")
				.map(normalizeTagId)
				.filter(Boolean)
		)
	).sort()

	return {
		search: (params.get("q") ?? "").trim(),
		category: (params.get("category") ?? "").trim(),
		tagIds,
		sort,
		page: parsePage(params.get("page")),
	}
}

export function serializeExamBrowseState(
	state: ExamBrowseState,
	current?: URLSearchParams
) {
	const params = new URLSearchParams(current)
	for (const key of BROWSE_KEYS) params.delete(key)

	if (state.search) params.set("q", state.search.trim())
	if (state.category) params.set("category", state.category.trim())
	if (state.tagIds.length) {
		params.set("tags", Array.from(new Set(state.tagIds.map(normalizeTagId))).sort().join(","))
	}
	if (state.sort !== "newest") params.set("sort", state.sort)
	if (state.page !== 1) params.set("page", String(state.page))

	return params
}

export function getNormalizedBrowseQuery(params: URLSearchParams) {
	return serializeExamBrowseState(parseExamBrowseParams(params), params).toString()
}

export function updateExamBrowseState(
	state: ExamBrowseState,
	patch: Partial<ExamBrowseState>,
	resetPage = true
): ExamBrowseState {
	return {
		...state,
		...patch,
		page: resetPage ? 1 : (patch.page ?? state.page),
	}
}

export function toExamApiParams(state: ExamBrowseState) {
	return {
		page: state.page,
		pageSize: EXAM_PAGE_SIZE,
		search: state.search || undefined,
		categorySlug: state.category || undefined,
		tagIds: state.tagIds,
		sort: state.sort === "oldest" ? ("Oldest" as const) : ("Newest" as const),
	}
}

export function serializeExamApiParams(params: ReturnType<typeof toExamApiParams>) {
	const query = new URLSearchParams()
	query.set("page", String(params.page))
	query.set("pageSize", String(params.pageSize))
	if (params.search) query.set("search", params.search)
	if (params.categorySlug) query.set("categorySlug", params.categorySlug)
	for (const tagId of params.tagIds) query.append("tagIds", tagId)
	query.set("sort", params.sort)
	return query.toString()
}
