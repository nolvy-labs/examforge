import {
	adminExamCategoriesResponseSchema,
	adminExamCategoryListFilterSchema,
	adminExamCategorySchema,
	adminExamTagListFilterSchema,
	adminExamTagSchema,
	adminExamTagsResponseSchema,
	createExamCategoryRequestSchema,
	createExamTagRequestSchema,
	examCategoryIdSchema,
	examTagIdSchema,
	updateExamCategoryRequestSchema,
	updateExamTagRequestSchema,
} from "@/features/exam-classifications/types/exam-classification.schema"
import type {
	AdminExamCategoryListFilter,
	AdminExamTagListFilter,
	CreateExamCategoryRequest,
	CreateExamTagRequest,
	UpdateExamCategoryRequest,
	UpdateExamTagRequest,
} from "@/features/exam-classifications/types/exam-classification.types"
import { apiClient } from "@/lib/api/api.client"
import { ApiError } from "@/lib/api/api.error"
import { parseApiResponse } from "@/lib/api/api.schema"

const ADMIN_EXAM_TAGS_ROUTE = "/api/v1/admin/exam-tags"
const ADMIN_EXAM_CATEGORIES_ROUTE = "/api/v1/admin/exam-categories"

const examTagTypeQueryValues = {
	0: "Unknown",
	1: "Subject",
	2: "ExamType",
	3: "Year",
	4: "Grade",
	5: "Skill",
	6: "Level",
	7: "Topic",
} as const

function appendQuery(path: string, query: URLSearchParams) {
	const serialized = query.toString()
	return serialized ? `${path}?${serialized}` : path
}

function assertNoContent(status: number, context: string) {
	if (status !== 204) {
		throw new ApiError({
			code: "invalid-response",
			message: "The service returned an unexpected response. Please try again.",
			context,
		})
	}
}

export function serializeAdminExamTagListFilters(
	filters: AdminExamTagListFilter = {}
) {
	const normalized = adminExamTagListFilterSchema.parse(filters)
	const query = new URLSearchParams()

	if (normalized.type !== undefined) {
		query.set("type", examTagTypeQueryValues[normalized.type])
	}
	if (normalized.includeArchived === false) {
		query.set("includeArchived", "false")
	}

	return query
}

export function serializeAdminExamCategoryListFilters(
	filters: AdminExamCategoryListFilter = {}
) {
	const normalized = adminExamCategoryListFilterSchema.parse(filters)
	const query = new URLSearchParams()

	if (normalized.isArchived !== undefined && normalized.isArchived !== null) {
		query.set("isArchived", String(normalized.isArchived))
	}

	return query
}

export async function getAdminExamTags(
	filters: AdminExamTagListFilter = {},
	signal?: AbortSignal
) {
	const query = serializeAdminExamTagListFilters(filters)
	const response = await apiClient.get<unknown>(
		appendQuery(ADMIN_EXAM_TAGS_ROUTE, query),
		{ signal }
	)

	return parseApiResponse(
		adminExamTagsResponseSchema,
		response.data,
		"admin exam tags"
	)
}

export async function getAdminExamTag(id: string, signal?: AbortSignal) {
	const tagId = examTagIdSchema.parse(id)
	const response = await apiClient.get<unknown>(
		`${ADMIN_EXAM_TAGS_ROUTE}/${tagId}`,
		{ signal }
	)

	return parseApiResponse(
		adminExamTagSchema,
		response.data,
		"admin exam tag"
	)
}

export async function createAdminExamTag(request: CreateExamTagRequest) {
	const payload = createExamTagRequestSchema.parse(request)
	const response = await apiClient.post<unknown>(ADMIN_EXAM_TAGS_ROUTE, payload)

	return parseApiResponse(
		adminExamTagSchema,
		response.data,
		"created admin exam tag"
	)
}

export async function updateAdminExamTag(
	id: string,
	request: UpdateExamTagRequest
) {
	const tagId = examTagIdSchema.parse(id)
	const payload = updateExamTagRequestSchema.parse(request)
	const response = await apiClient.put<unknown>(
		`${ADMIN_EXAM_TAGS_ROUTE}/${tagId}`,
		payload
	)

	return parseApiResponse(
		adminExamTagSchema,
		response.data,
		"updated admin exam tag"
	)
}

export async function archiveAdminExamTag(id: string) {
	const tagId = examTagIdSchema.parse(id)
	const response = await apiClient.post(
		`${ADMIN_EXAM_TAGS_ROUTE}/${tagId}/archive`
	)
	assertNoContent(response.status, "archive admin exam tag")
}

export async function restoreAdminExamTag(id: string) {
	const tagId = examTagIdSchema.parse(id)
	const response = await apiClient.post(
		`${ADMIN_EXAM_TAGS_ROUTE}/${tagId}/restore`
	)
	assertNoContent(response.status, "restore admin exam tag")
}

export async function getAdminExamCategories(
	filters: AdminExamCategoryListFilter = {},
	signal?: AbortSignal
) {
	const query = serializeAdminExamCategoryListFilters(filters)
	const response = await apiClient.get<unknown>(
		appendQuery(ADMIN_EXAM_CATEGORIES_ROUTE, query),
		{ signal }
	)

	return parseApiResponse(
		adminExamCategoriesResponseSchema,
		response.data,
		"admin exam categories"
	)
}

export async function getAdminExamCategory(
	id: string,
	signal?: AbortSignal
) {
	const categoryId = examCategoryIdSchema.parse(id)
	const response = await apiClient.get<unknown>(
		`${ADMIN_EXAM_CATEGORIES_ROUTE}/${categoryId}`,
		{ signal }
	)

	return parseApiResponse(
		adminExamCategorySchema,
		response.data,
		"admin exam category"
	)
}

export async function createAdminExamCategory(
	request: CreateExamCategoryRequest
) {
	const payload = createExamCategoryRequestSchema.parse(request)
	const response = await apiClient.post<unknown>(
		ADMIN_EXAM_CATEGORIES_ROUTE,
		payload
	)

	return parseApiResponse(
		adminExamCategorySchema,
		response.data,
		"created admin exam category"
	)
}

export async function updateAdminExamCategory(
	id: string,
	request: UpdateExamCategoryRequest
) {
	const categoryId = examCategoryIdSchema.parse(id)
	const payload = updateExamCategoryRequestSchema.parse(request)
	const response = await apiClient.put<unknown>(
		`${ADMIN_EXAM_CATEGORIES_ROUTE}/${categoryId}`,
		payload
	)

	return parseApiResponse(
		adminExamCategorySchema,
		response.data,
		"updated admin exam category"
	)
}

export async function archiveAdminExamCategory(id: string) {
	const categoryId = examCategoryIdSchema.parse(id)
	const response = await apiClient.delete(
		`${ADMIN_EXAM_CATEGORIES_ROUTE}/${categoryId}`
	)
	assertNoContent(response.status, "archive admin exam category")
}

export async function restoreAdminExamCategory(id: string) {
	const categoryId = examCategoryIdSchema.parse(id)
	const response = await apiClient.post(
		`${ADMIN_EXAM_CATEGORIES_ROUTE}/${categoryId}/restore`
	)
	assertNoContent(response.status, "restore admin exam category")
}
