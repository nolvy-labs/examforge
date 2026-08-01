import { z } from "zod"

import { apiClient } from "@/lib/api/api.client"
import { ApiError } from "@/lib/api/api.error"
import { parseApiResponse } from "@/lib/api/api.schema"

import {
	adminExamListRequestSchema,
	adminExamListResponseSchema,
	createExamRequestSchema,
	createExamResponseSchema,
} from "../types/exam.schema"
import type {
	AdminExamListRequest,
	CreateExamRequest,
} from "../types/exam.types"

const uuidSchema = z.uuid()

function getUniqueSortedTagIds(tagIds: string[]) {
	return Array.from(new Set(tagIds.map((tagId) => tagId.toLowerCase()))).sort()
}

export function serializeAdminExamListRequest(request: AdminExamListRequest) {
	const normalized = adminExamListRequestSchema.parse(request)
	const query = new URLSearchParams()

	query.set("page", String(normalized.page))
	query.set("pageSize", String(normalized.pageSize))
	const search = normalized.search?.trim()
	if (search) query.set("search", search)
	for (const tagId of getUniqueSortedTagIds(normalized.tagIds)) {
		query.append("tagIds", tagId)
	}
	if (normalized.type !== null) {
		query.set("type", normalized.type === 0 ? "Simple" : "Ielts")
	}
	if (normalized.archive !== "active") {
		query.set(
			"archive",
			normalized.archive === "archived" ? "Archived" : "All"
		)
	}
	if (normalized.sort !== "newest") query.set("sort", "Oldest")

	return query
}

export async function getAdminExams(
	request: AdminExamListRequest,
	signal?: AbortSignal
) {
	const query = serializeAdminExamListRequest(request)
	const response = await apiClient.get<unknown>(
		`/api/v1/admin/exams?${query.toString()}`,
		{ signal }
	)

	return parseApiResponse(
		adminExamListResponseSchema,
		response.data,
		"admin exams"
	)
}

export async function createAdminExam(request: CreateExamRequest) {
	const payload = createExamRequestSchema.parse(request)
	const response = await apiClient.post<unknown>(
		"/api/v1/admin/exams",
		payload
	)

	return parseApiResponse(
		createExamResponseSchema,
		response.data,
		"created admin exam"
	)
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

export async function archiveAdminExam(id: string) {
	const examId = uuidSchema.parse(id)
	const response = await apiClient.delete(`/api/v1/admin/exams/${examId}`)
	assertNoContent(response.status, "archive admin exam")
}

export async function restoreAdminExam(id: string) {
	const examId = uuidSchema.parse(id)
	const response = await apiClient.post(
		`/api/v1/admin/exams/${examId}/restore`
	)
	assertNoContent(response.status, "restore admin exam")
}
