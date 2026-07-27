import { apiClient } from "@/lib/api/api.client"

import {
	serializeExamApiParams,
	toExamApiParams,
} from "../model/exam-browse.params"
import type {
	ExamBrowseState,
	StudentExamCategory,
	StudentExamFilters,
	StudentExamPage,
} from "../model/exam-browse.types"

export async function getStudentExams(
	state: ExamBrowseState,
	signal?: AbortSignal
) {
	const params = toExamApiParams(state)
	const query = serializeExamApiParams(params)
	const response = await apiClient.get<StudentExamPage>(
		`/api/v1/exams?${query}`,
		{ signal }
	)
	return response.data
}

export async function getStudentExamFilters(signal?: AbortSignal) {
	const response = await apiClient.get<StudentExamFilters>(
		"/api/v1/exams/filters",
		{ signal }
	)
	return response.data
}

export async function getStudentExamCategories(signal?: AbortSignal) {
	const response = await apiClient.get<StudentExamCategory[]>(
		"/api/v1/exam-categories",
		{ params: { featuredOnly: false }, signal }
	)
	return response.data
}
