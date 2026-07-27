import { apiClient } from "@/lib/api/api.client"

import type {
	CreatedExamAttempt,
	ExamAttemptState,
	StudentExamAttemptPage,
	StudentExamDetail,
} from "../model/exam-detail.types"

export async function getStudentExamDetail(slug: string, signal?: AbortSignal) {
	const response = await apiClient.get<StudentExamDetail>(
		`/api/v1/exams/${encodeURIComponent(slug)}`,
		{ signal }
	)
	return response.data
}

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
	const response = await apiClient.get<StudentExamAttemptPage>(
		`/api/v1/exam-attempts?${params.toString()}`,
		{ signal }
	)
	return response.data
}

export async function createStudentExamAttempt(examId: string) {
	const response = await apiClient.post<Omit<CreatedExamAttempt, "etag">>(
		`/api/v1/exams/${encodeURIComponent(examId)}/attempts`
	)
	return {
		...response.data,
		etag: response.headers.etag as string | undefined,
	}
}
