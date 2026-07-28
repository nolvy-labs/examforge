import { apiClient } from "@/lib/api/api.client"
import { parseApiResponse } from "@/lib/api/api.schema"

import type {
	AttemptPatchOperation,
	AttemptResponse,
	ExamAttemptState,
} from "../types/attempt.type"
import {
	attemptDetailSchema,
	createdExamAttemptSchema,
	studentExamAttemptPageSchema,
} from "../types/attempt.schema"

function withEtag(data: unknown, etag: unknown): AttemptResponse {
	const detail = parseApiResponse(attemptDetailSchema, data, "exam attempt detail")
	return {
		data: detail,
		etag: typeof etag === "string" ? etag : `"${detail.revision}"`,
	}
}

export async function getAttempt(attemptId: string, signal?: AbortSignal) {
	const response = await apiClient.get<unknown>(
		`/api/v1/exam-attempts/${encodeURIComponent(attemptId)}`,
		{ signal }
	)
	return withEtag(response.data, response.headers.etag)
}

export async function patchAttempt(
	attemptId: string,
	etag: string,
	operations: AttemptPatchOperation[]
) {
	const response = await apiClient.patch<unknown>(
		`/api/v1/exam-attempts/${encodeURIComponent(attemptId)}`,
		operations,
		{
			headers: {
				"If-Match": etag,
				"Content-Type": "application/json-patch+json",
			},
		}
	)
	return withEtag(response.data, response.headers.etag)
}

async function transitionAttempt(
	attemptId: string,
	action: "submit" | "abandon",
	etag: string
) {
	const response = await apiClient.post<unknown>(
		`/api/v1/exam-attempts/${encodeURIComponent(attemptId)}/${action}`,
		undefined,
		{ headers: { "If-Match": etag } }
	)
	return withEtag(response.data, response.headers.etag)
}

export const submitAttempt = (attemptId: string, etag: string) => transitionAttempt(attemptId, "submit", etag)
export const abandonAttempt = (attemptId: string, etag: string) => transitionAttempt(attemptId, "abandon", etag)

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
		etag:
			typeof response.headers.etag === "string"
				? response.headers.etag
				: undefined,
	}
}
