import { apiClient } from "@/lib/api/api.client"
import { parseApiResponse } from "@/lib/api/api.schema"

import {
	studentExamCategoriesSchema,
	studentExamFiltersSchema,
	studentExamPageSchema,
} from "../types/exam.schema"

export interface StudentExamRequest {
	page: number
	pageSize: number
	search?: string
	categorySlug?: string
	tagIds: string[]
	sort: "Newest" | "Oldest"
}

export function serializeStudentExamRequest(params: StudentExamRequest) {
	const query = new URLSearchParams()
	query.set("page", String(params.page))
	query.set("pageSize", String(params.pageSize))
	if (params.search) query.set("search", params.search)
	if (params.categorySlug) query.set("categorySlug", params.categorySlug)
	for (const tagId of params.tagIds) query.append("tagIds", tagId)
	query.set("sort", params.sort)
	return query.toString()
}

export async function getStudentExams(
	request: StudentExamRequest,
	signal?: AbortSignal
) {
	const query = serializeStudentExamRequest(request)
	const response = await apiClient.get<unknown>(`/api/v1/exams?${query}`, {
		signal,
	})
	return parseApiResponse(studentExamPageSchema, response.data, "student exams")
}

export async function getStudentExamFilters(signal?: AbortSignal) {
	const response = await apiClient.get<unknown>("/api/v1/exams/filters", {
		signal,
	})
	return parseApiResponse(
		studentExamFiltersSchema,
		response.data,
		"student exam filters"
	)
}

export async function getStudentExamCategories(signal?: AbortSignal) {
	const response = await apiClient.get<unknown>("/api/v1/exam-categories", {
		params: { featuredOnly: false },
		signal,
	})
	return parseApiResponse(
		studentExamCategoriesSchema,
		response.data,
		"student exam categories"
	)
}
