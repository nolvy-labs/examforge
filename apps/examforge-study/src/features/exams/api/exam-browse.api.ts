import { apiClient } from "@/lib/api/api.client"
import { parseApiResponse } from "@/lib/api/api.schema"

import {
	serializeExamApiParams,
	toExamApiParams,
} from "../model/exam-browse.params"
import type {
	ExamBrowseState,
} from "../model/exam-browse.types"
import {
	studentExamCategoriesSchema,
	studentExamFiltersSchema,
	studentExamPageSchema,
} from "../model/exam.schema"

export async function getStudentExams(
	state: ExamBrowseState,
	signal?: AbortSignal
) {
	const params = toExamApiParams(state)
	const query = serializeExamApiParams(params)
	const response = await apiClient.get<unknown>(
		`/api/v1/exams?${query}`,
		{ signal }
	)
	return parseApiResponse(studentExamPageSchema, response.data, "student exams")
}

export async function getStudentExamFilters(signal?: AbortSignal) {
	const response = await apiClient.get<unknown>(
		"/api/v1/exams/filters",
		{ signal }
	)
	return parseApiResponse(
		studentExamFiltersSchema,
		response.data,
		"student exam filters"
	)
}

export async function getStudentExamCategories(signal?: AbortSignal) {
	const response = await apiClient.get<unknown>(
		"/api/v1/exam-categories",
		{ params: { featuredOnly: false }, signal }
	)
	return parseApiResponse(
		studentExamCategoriesSchema,
		response.data,
		"student exam categories"
	)
}
