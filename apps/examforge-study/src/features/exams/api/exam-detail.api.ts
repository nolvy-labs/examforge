import { apiClient } from "@/lib/api/api.client"
import { parseApiResponse } from "@/lib/api/api.schema"

import type { ExamAttemptState } from "../model/exam-detail.types"
import {
	createdExamAttemptSchema,
	studentExamAttemptPageSchema,
} from "../model/exam.schema"

export async function getStudentExamAttempts(
	examId: string,
	state: ExamAttemptState,
	page: number,
	pageSize: number,
	signal?: AbortSignal
) {
	const params = new URLSearchParams({
		examId,
		state,
		page: String(page),
		pageSize: String(pageSize),
	})
	const response = await apiClient.get<unknown>(
		`/api/v1/exam-attempts?${params.toString()}`,
		{ signal }
	)
	return parseApiResponse(
		studentExamAttemptPageSchema,
		response.data,
		"student exam attempts"
	)
}

export async function createStudentExamAttempt(examId: string) {
	const response = await apiClient.post<unknown>(
		`/api/v1/exams/${encodeURIComponent(examId)}/attempts`
	)
	const attempt = parseApiResponse(
		createdExamAttemptSchema,
		response.data,
		"created exam attempt"
	)
	return {
		...attempt,
		etag: typeof response.headers.etag === "string"
			? response.headers.etag
			: undefined,
	}
}
