import { z } from "zod"

import { apiClient } from "@/lib/api/api.client"
import { ApiError } from "@/lib/api/api.error"
import { parseApiResponse } from "@/lib/api/api.schema"

import {
	bulkUpdateExamVersionContentRequestSchema,
	bulkUpdateExamVersionContentResponseSchema,
	contentRevisionEtagSchema,
	createExamSectionRequestSchema,
	createExamVersionRequestSchema,
	createFillAnswerKeyRequestSchema,
	createQuestionOptionRequestSchema,
	createQuestionRequestSchema,
	examSectionDetailResponseSchema,
	examSectionSummaryListResponseSchema,
	examVersionDetailResponseSchema,
	examVersionListResponseSchema,
	fillAnswerKeyResponseSchema,
	fullExamVersionResponseSchema,
	getExamVersionsRequestSchema,
	patchOperationSchema,
	questionDetailResponseSchema,
	questionOptionResponseSchema,
	questionSummaryListResponseSchema,
	reorderExamSectionsRequestSchema,
	reorderQuestionOptionsRequestSchema,
	reorderQuestionsRequestSchema,
} from "../../types/exam-version.schema"
import type {
	BulkUpdateExamVersionContentRequest,
	CreateExamSectionRequest,
	CreateExamVersionRequest,
	CreateFillAnswerKeyRequest,
	CreateQuestionOptionRequest,
	CreateQuestionRequest,
	ExamSectionDetailDto,
	GetExamVersionsRequest,
	PatchOperation,
	QuestionDetailDto,
	ReorderExamSectionsRequest,
	ReorderQuestionOptionsRequest,
	ReorderQuestionsRequest,
} from "../../types/exam-version.types"

const uuidSchema = z.uuid()
const patchDocumentSchema = z.array(patchOperationSchema).min(1).max(20)
const SECTION_READ_CONCURRENCY = 4
const QUESTION_READ_CONCURRENCY = 8

export interface VersionApiResponse<T> {
	data: T
	etag: string
}

export interface VersionContentScope {
	examId: string
	versionId: string
}

export interface SectionContentScope extends VersionContentScope {
	sectionId: string
}

export interface QuestionContentScope extends SectionContentScope {
	questionId: string
}

function parseId(value: string) {
	return uuidSchema.parse(value)
}

function sameId(left: string, right: string) {
	return left.toLowerCase() === right.toLowerCase()
}

function versionBase(scope: VersionContentScope) {
	return `/api/v1/admin/exams/${encodeURIComponent(parseId(scope.examId))}/versions/${encodeURIComponent(parseId(scope.versionId))}`
}

function sectionBase(scope: SectionContentScope) {
	return `${versionBase(scope)}/sections/${encodeURIComponent(parseId(scope.sectionId))}`
}

function questionBase(scope: QuestionContentScope) {
	return `${sectionBase(scope)}/questions/${encodeURIComponent(parseId(scope.questionId))}`
}

function requireEtag(header: unknown, context: string) {
	const result = contentRevisionEtagSchema.safeParse(header)
	if (result.success) return result.data
	throw new ApiError({
		code: "invalid-response",
		message: "The service did not return a valid content revision.",
		context,
	})
}

function assertNoContent(status: number, context: string) {
	if (status !== 204) {
		throw new ApiError({
			code: "invalid-response",
			message: "The service returned an unexpected response.",
			context,
		})
	}
}

function jsonPatchConfig() {
	return { headers: { "Content-Type": "application/json-patch+json" } }
}

async function mapWithConcurrency<T, R>(
	values: T[],
	limit: number,
	map: (value: T) => Promise<R>
) {
	const results = new Array<R>(values.length)
	let nextIndex = 0
	await Promise.all(
		Array.from({ length: Math.min(limit, values.length) }, async () => {
			while (nextIndex < values.length) {
				const index = nextIndex
				nextIndex += 1
				const value = values[index]
				if (value !== undefined) results[index] = await map(value)
			}
		})
	)
	return results
}

export function escapeJsonPointerSegment(segment: string) {
	return segment.replaceAll("~", "~0").replaceAll("/", "~1")
}

export function serializeVersionListRequest(request: GetExamVersionsRequest) {
	const parsed = getExamVersionsRequestSchema.parse(request)
	const query = new URLSearchParams({
		page: String(parsed.page),
		pageSize: String(parsed.pageSize),
		sort: parsed.sort === "newest" ? "Newest" : "Oldest",
	})
	if (parsed.status !== null && parsed.status !== undefined) {
		query.set("status", ["Draft", "Published", "Retired"][parsed.status])
	}
	return query
}

export async function getAdminExamVersions(
	examId: string,
	request: GetExamVersionsRequest,
	signal?: AbortSignal
) {
	const query = serializeVersionListRequest(request)
	const response = await apiClient.get<unknown>(
		`/api/v1/admin/exams/${encodeURIComponent(parseId(examId))}/versions?${query.toString()}`,
		{ signal }
	)
	return parseApiResponse(
		examVersionListResponseSchema,
		response.data,
		"admin exam versions"
	)
}

export async function getAdminExamVersion(
	scope: VersionContentScope,
	signal?: AbortSignal
) {
	const response = await apiClient.get<unknown>(versionBase(scope), { signal })
	const data = parseApiResponse(
		examVersionDetailResponseSchema,
		response.data,
		"admin exam version"
	)
	return {
		data,
		etag: requireEtag(response.headers.etag, "admin exam version ETag"),
	} satisfies VersionApiResponse<typeof data>
}

async function getSectionList(scope: VersionContentScope, signal?: AbortSignal) {
	const response = await apiClient.get<unknown>(`${versionBase(scope)}/sections`, {
		signal,
	})
	return parseApiResponse(
		examSectionSummaryListResponseSchema,
		response.data,
		"admin exam section list"
	)
}

async function getSection(
	scope: SectionContentScope,
	signal?: AbortSignal
) {
	const response = await apiClient.get<unknown>(sectionBase(scope), { signal })
	return parseApiResponse(
		examSectionDetailResponseSchema,
		response.data,
		"admin exam section"
	)
}

async function getQuestionList(
	scope: SectionContentScope,
	signal?: AbortSignal
) {
	const response = await apiClient.get<unknown>(`${sectionBase(scope)}/questions`, {
		signal,
	})
	return parseApiResponse(
		questionSummaryListResponseSchema,
		response.data,
		"admin exam question list"
	)
}

async function getQuestion(
	scope: QuestionContentScope,
	signal?: AbortSignal
) {
	const response = await apiClient.get<unknown>(questionBase(scope), { signal })
	return parseApiResponse(
		questionDetailResponseSchema,
		response.data,
		"admin exam question"
	)
}

function assembleSection(
	section: ExamSectionDetailDto,
	questions: QuestionDetailDto[]
) {
	const byId = new Map(questions.map((question) => [question.id, question]))
	const children = new Map<string, QuestionDetailDto[]>()
	for (const question of questions) {
		if (!question.parentQuestionId) continue
		const siblings = children.get(question.parentQuestionId) ?? []
		siblings.push(question)
		children.set(question.parentQuestionId, siblings)
	}
	const ordered = (values: QuestionDetailDto[]) =>
		[...values].sort(
			(left, right) =>
				left.displayOrder - right.displayOrder || left.id.localeCompare(right.id)
		)
	const topLevel = ordered(
		questions.filter((question) => question.parentQuestionId === null)
	).map((question) => ({
		...question,
		childQuestions: ordered(children.get(question.id) ?? []),
	}))

	for (const parentId of children.keys()) {
		if (!byId.has(parentId)) {
			throw new ApiError({
				code: "invalid-response",
				message: "The service returned a question with an unknown parent.",
				context: "complete admin exam version",
			})
		}
	}
	return { ...section, questions: topLevel }
}

export async function getCompleteAdminExamVersion(
	scope: VersionContentScope,
	signal?: AbortSignal
) {
	const initial = await getAdminExamVersion(scope, signal)
	if (!sameId(initial.data.examId, parseId(scope.examId))) {
		throw new ApiError({
			code: "not-found",
			status: 404,
			message: "The exam version does not belong to this exam.",
			context: "complete admin exam version ownership",
		})
	}
	const sectionSummaries = await getSectionList(scope, signal)
	const sections = await mapWithConcurrency(
		sectionSummaries,
		SECTION_READ_CONCURRENCY,
		async (summary) => {
			if (!sameId(summary.examVersionId, initial.data.id)) {
				throw new ApiError({
					code: "invalid-response",
					message: "The service returned a Section from another version.",
					context: "complete admin exam version ownership",
				})
			}
			const sectionScope = { ...scope, sectionId: summary.id }
			const [section, questionSummaries] = await Promise.all([
				getSection(sectionScope, signal),
				getQuestionList(sectionScope, signal),
			])
			if (
				!sameId(section.id, summary.id) ||
				!sameId(section.examVersionId, initial.data.id)
			) {
				throw new ApiError({
					code: "invalid-response",
					message: "The service returned mismatched Section details.",
					context: "complete admin exam version ownership",
				})
			}
			const questions = await mapWithConcurrency(
				questionSummaries,
				QUESTION_READ_CONCURRENCY,
				(question) => {
					if (!sameId(question.examSectionId, summary.id)) {
						throw new ApiError({
							code: "invalid-response",
							message: "The service returned a Question from another Section.",
							context: "complete admin exam version ownership",
						})
					}
					return getQuestion({ ...sectionScope, questionId: question.id }, signal).then(
						(detail) => {
							if (
								!sameId(detail.id, question.id) ||
								!sameId(detail.examSectionId, summary.id)
							) {
								throw new ApiError({
									code: "invalid-response",
									message: "The service returned mismatched Question details.",
									context: "complete admin exam version ownership",
								})
							}
							return detail
						}
					)
				}
			)
			return assembleSection(section, questions)
		}
	)
	const confirmed = await getAdminExamVersion(scope, signal)
	if (confirmed.data.contentRevision !== initial.data.contentRevision) {
		throw new ApiError({
			code: "conflict",
			status: 409,
			message: "The version changed while its content was loading.",
			context: "complete admin exam version revision",
		})
	}
	const data = parseApiResponse(
		fullExamVersionResponseSchema,
		{ ...confirmed.data, sections },
		"complete admin exam version"
	)
	return { data, etag: confirmed.etag } satisfies VersionApiResponse<typeof data>
}

export async function createAdminExamVersion(
	examId: string,
	request: CreateExamVersionRequest
) {
	const payload = createExamVersionRequestSchema.parse(request)
	const response = await apiClient.post<unknown>(
		`/api/v1/admin/exams/${encodeURIComponent(parseId(examId))}/versions`,
		payload
	)
	const data = parseApiResponse(
		examVersionDetailResponseSchema,
		response.data,
		"created admin exam version"
	)
	return {
		data,
		etag: requireEtag(response.headers.etag, "created admin exam version ETag"),
	} satisfies VersionApiResponse<typeof data>
}

export const createEmptyAdminExamVersion = (examId: string) =>
	createAdminExamVersion(examId, {})

export const cloneAdminExamVersion = (examId: string, sourceVersionId: string) =>
	createAdminExamVersion(examId, { sourceVersionId: parseId(sourceVersionId) })

export async function publishAdminExamVersion(scope: VersionContentScope) {
	const response = await apiClient.post<unknown>(`${versionBase(scope)}/publish`)
	const data = parseApiResponse(
		examVersionDetailResponseSchema,
		response.data,
		"published admin exam version"
	)
	return {
		data,
		etag: requireEtag(response.headers.etag, "published admin exam version ETag"),
	} satisfies VersionApiResponse<typeof data>
}

export async function patchAdminExamVersion(
	scope: VersionContentScope,
	operations: PatchOperation[]
) {
	const payload = patchDocumentSchema.parse(operations)
	const response = await apiClient.patch<unknown>(
		versionBase(scope),
		payload,
		jsonPatchConfig()
	)
	const data = parseApiResponse(
		examVersionDetailResponseSchema,
		response.data,
		"updated admin exam version"
	)
	return {
		data,
		etag: requireEtag(response.headers.etag, "updated admin exam version ETag"),
	} satisfies VersionApiResponse<typeof data>
}

export async function batchUpdateAdminExamVersionContent(
	scope: VersionContentScope,
	etag: string,
	request: BulkUpdateExamVersionContentRequest
) {
	const payload = bulkUpdateExamVersionContentRequestSchema.parse(request)
	const response = await apiClient.post<unknown>(
		`${versionBase(scope)}/content/batch`,
		payload,
		{ headers: { "If-Match": contentRevisionEtagSchema.parse(etag) } }
	)
	const data = parseApiResponse(
		bulkUpdateExamVersionContentResponseSchema,
		response.data,
		"batch updated admin exam version content"
	)
	return {
		data,
		etag: requireEtag(response.headers.etag, "batch update ETag"),
	} satisfies VersionApiResponse<typeof data>
}

export async function createAdminExamSection(
	scope: VersionContentScope,
	request: CreateExamSectionRequest
) {
	const response = await apiClient.post<unknown>(
		`${versionBase(scope)}/sections`,
		createExamSectionRequestSchema.parse(request)
	)
	return parseApiResponse(
		examSectionDetailResponseSchema,
		response.data,
		"created admin exam section"
	)
}

export async function patchAdminExamSection(
	scope: SectionContentScope,
	operations: PatchOperation[]
) {
	const response = await apiClient.patch<unknown>(
		sectionBase(scope),
		patchDocumentSchema.parse(operations),
		jsonPatchConfig()
	)
	return parseApiResponse(
		examSectionDetailResponseSchema,
		response.data,
		"updated admin exam section"
	)
}

export async function deleteAdminExamSection(scope: SectionContentScope) {
	const response = await apiClient.delete(sectionBase(scope))
	assertNoContent(response.status, "deleted admin exam section")
}

export async function reorderAdminExamSections(
	scope: VersionContentScope,
	request: ReorderExamSectionsRequest
) {
	const response = await apiClient.put<unknown>(
		`${versionBase(scope)}/sections/order`,
		reorderExamSectionsRequestSchema.parse(request)
	)
	return parseApiResponse(
		examSectionSummaryListResponseSchema,
		response.data,
		"reordered admin exam sections"
	)
}

export async function createAdminQuestion(
	scope: SectionContentScope,
	request: CreateQuestionRequest
) {
	const response = await apiClient.post<unknown>(
		`${sectionBase(scope)}/questions`,
		createQuestionRequestSchema.parse(request)
	)
	return parseApiResponse(
		questionDetailResponseSchema,
		response.data,
		"created admin question"
	)
}

export async function patchAdminQuestion(
	scope: QuestionContentScope,
	operations: PatchOperation[]
) {
	const response = await apiClient.patch<unknown>(
		questionBase(scope),
		patchDocumentSchema.parse(operations),
		jsonPatchConfig()
	)
	return parseApiResponse(
		questionDetailResponseSchema,
		response.data,
		"updated admin question"
	)
}

export async function deleteAdminQuestion(scope: QuestionContentScope) {
	const response = await apiClient.delete(questionBase(scope))
	assertNoContent(response.status, "deleted admin question")
}

export async function reorderAdminQuestions(
	scope: SectionContentScope,
	request: ReorderQuestionsRequest
) {
	const response = await apiClient.put<unknown>(
		`${sectionBase(scope)}/questions/order`,
		reorderQuestionsRequestSchema.parse(request)
	)
	return parseApiResponse(
		questionSummaryListResponseSchema,
		response.data,
		"reordered admin questions"
	)
}

export async function createAdminQuestionOption(
	scope: QuestionContentScope,
	request: CreateQuestionOptionRequest
) {
	const response = await apiClient.post<unknown>(
		`${questionBase(scope)}/options`,
		createQuestionOptionRequestSchema.parse(request)
	)
	return parseApiResponse(
		questionOptionResponseSchema,
		response.data,
		"created admin question option"
	)
}

export async function patchAdminQuestionOption(
	scope: QuestionContentScope & { optionId: string },
	operations: PatchOperation[]
) {
	const response = await apiClient.patch<unknown>(
		`${questionBase(scope)}/options/${encodeURIComponent(parseId(scope.optionId))}`,
		patchDocumentSchema.parse(operations),
		jsonPatchConfig()
	)
	return parseApiResponse(
		questionOptionResponseSchema,
		response.data,
		"updated admin question option"
	)
}

export async function deleteAdminQuestionOption(
	scope: QuestionContentScope & { optionId: string }
) {
	const response = await apiClient.delete(
		`${questionBase(scope)}/options/${encodeURIComponent(parseId(scope.optionId))}`
	)
	assertNoContent(response.status, "deleted admin question option")
}

export async function reorderAdminQuestionOptions(
	scope: QuestionContentScope,
	request: ReorderQuestionOptionsRequest
) {
	const response = await apiClient.put<unknown>(
		`${questionBase(scope)}/options/order`,
		reorderQuestionOptionsRequestSchema.parse(request)
	)
	return parseApiResponse(
		z.array(questionOptionResponseSchema),
		response.data,
		"reordered admin question options"
	)
}

export async function createAdminFillAnswerKey(
	scope: QuestionContentScope,
	request: CreateFillAnswerKeyRequest
) {
	const response = await apiClient.post<unknown>(
		`${questionBase(scope)}/answer-keys`,
		createFillAnswerKeyRequestSchema.parse(request)
	)
	return parseApiResponse(
		fillAnswerKeyResponseSchema,
		response.data,
		"created admin fill answer key"
	)
}

export async function patchAdminFillAnswerKey(
	scope: QuestionContentScope & { answerKeyId: string },
	operations: PatchOperation[]
) {
	const response = await apiClient.patch<unknown>(
		`${questionBase(scope)}/answer-keys/${encodeURIComponent(parseId(scope.answerKeyId))}`,
		patchDocumentSchema.parse(operations),
		jsonPatchConfig()
	)
	return parseApiResponse(
		fillAnswerKeyResponseSchema,
		response.data,
		"updated admin fill answer key"
	)
}

export async function deleteAdminFillAnswerKey(
	scope: QuestionContentScope & { answerKeyId: string }
) {
	const response = await apiClient.delete(
		`${questionBase(scope)}/answer-keys/${encodeURIComponent(parseId(scope.answerKeyId))}`
	)
	assertNoContent(response.status, "deleted admin fill answer key")
}
