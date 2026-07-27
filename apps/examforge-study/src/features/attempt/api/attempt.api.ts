import { apiClient } from "@/lib/api/api.client"

import type {
	AttemptDetail,
	AttemptPatchOperation,
	AttemptResponse,
} from "../types/attempt.type"

function withEtag(data: AttemptDetail, etag: unknown): AttemptResponse {
	return {
		data,
		etag: typeof etag === "string" ? etag : `"${data.revision}"`,
	}
}

export async function getAttempt(attemptId: string, signal?: AbortSignal) {
	const response = await apiClient.get<AttemptDetail>(
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
	const response = await apiClient.patch<AttemptDetail>(
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
	const response = await apiClient.post<AttemptDetail>(
		`/api/v1/exam-attempts/${encodeURIComponent(attemptId)}/${action}`,
		undefined,
		{ headers: { "If-Match": etag } }
	)
	return withEtag(response.data, response.headers.etag)
}

export const submitAttempt = (attemptId: string, etag: string) =>
	transitionAttempt(attemptId, "submit", etag)
export const abandonAttempt = (attemptId: string, etag: string) =>
	transitionAttempt(attemptId, "abandon", etag)
