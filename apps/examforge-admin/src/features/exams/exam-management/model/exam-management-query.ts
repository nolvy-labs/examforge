import { z } from "zod"

import {
	adminExamListRequestSchema,
	EXAM_PAGE_SIZE,
	EXAM_SEARCH_MAX_LENGTH,
	examArchiveFilterSchema,
	examSortOrderSchema,
	examTypeSchema,
} from "../../types/exam.schema"

const MANAGEMENT_QUERY_KEYS = [
	"search",
	"tagIds",
	"type",
	"archive",
	"sort",
	"page",
	"pageSize",
] as const

const uuidSchema = z.uuid()

export const examManagementQueryStateSchema = z.strictObject({
	search: z.string().max(EXAM_SEARCH_MAX_LENGTH),
	tagIds: z.array(uuidSchema),
	type: examTypeSchema.nullable(),
	archive: examArchiveFilterSchema,
	sort: examSortOrderSchema,
	page: z.number().int().positive(),
})

export type ExamManagementQueryState = z.infer<
	typeof examManagementQueryStateSchema
>

function parsePage(value: string | null) {
	if (!value || !/^\d+$/.test(value)) return 1

	const page = Number(value)
	return Number.isSafeInteger(page) && page > 0 ? page : 1
}

function parseExamType(value: string | null): ExamManagementQueryState["type"] {
	switch (value?.trim().toLowerCase()) {
		case "simple":
			return 0
		case "ielts":
			return 1
		default:
			return null
	}
}

function parseArchive(
	value: string | null
): ExamManagementQueryState["archive"] {
	switch (value?.trim().toLowerCase()) {
		case "archived":
			return "archived"
		case "all":
			return "all"
		default:
			return "active"
	}
}

function parseSort(value: string | null): ExamManagementQueryState["sort"] {
	return value?.trim().toLowerCase() === "oldest" ? "oldest" : "newest"
}

function parseTagIds(params: URLSearchParams) {
	return Array.from(
		new Set(
			params
				.getAll("tagIds")
				.map((tagId) => tagId.trim().toLowerCase())
				.filter((tagId) => uuidSchema.safeParse(tagId).success)
		)
	).sort()
}

export function parseExamManagementQuery(
	params: URLSearchParams
): ExamManagementQueryState {
	return examManagementQueryStateSchema.parse({
		search: (params.get("search") ?? "")
			.trim()
			.slice(0, EXAM_SEARCH_MAX_LENGTH),
		tagIds: parseTagIds(params),
		type: parseExamType(params.get("type")),
		archive: parseArchive(params.get("archive")),
		sort: parseSort(params.get("sort")),
		page: parsePage(params.get("page")),
	})
}

export function serializeExamManagementQuery(
	state: ExamManagementQueryState,
	current?: URLSearchParams
) {
	const normalized = examManagementQueryStateSchema.parse(state)
	const params = new URLSearchParams(current)

	for (const key of MANAGEMENT_QUERY_KEYS) params.delete(key)

	if (normalized.search) params.set("search", normalized.search.trim())
	for (const tagId of Array.from(new Set(normalized.tagIds)).sort()) {
		params.append("tagIds", tagId)
	}
	if (normalized.type !== null) {
		params.set("type", normalized.type === 0 ? "simple" : "ielts")
	}
	if (normalized.archive !== "active") {
		params.set("archive", normalized.archive)
	}
	if (normalized.sort !== "newest") params.set("sort", normalized.sort)
	if (normalized.page !== 1) params.set("page", String(normalized.page))

	return params
}

export function getNormalizedExamManagementQuery(params: URLSearchParams) {
	return serializeExamManagementQuery(
		parseExamManagementQuery(params),
		params
	).toString()
}

export function updateExamManagementState(
	state: ExamManagementQueryState,
	patch: Partial<ExamManagementQueryState>,
	resetPage = true
): ExamManagementQueryState {
	return examManagementQueryStateSchema.parse({
		...state,
		...patch,
		page: resetPage ? 1 : (patch.page ?? state.page),
	})
}

export function toAdminExamListRequest(state: ExamManagementQueryState) {
	return adminExamListRequestSchema.parse({
		page: state.page,
		pageSize: EXAM_PAGE_SIZE,
		search: state.search || undefined,
		tagIds: state.tagIds,
		type: state.type,
		archive: state.archive,
		sort: state.sort,
	})
}
