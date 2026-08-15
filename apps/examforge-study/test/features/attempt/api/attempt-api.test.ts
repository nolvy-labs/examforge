import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/api.error"
import {
	abandonAttempt,
	createStudentExamAttempt,
	getAttempt,
	getStudentExamAttempts,
	patchAttempt,
	submitAttempt,
} from "@/features/attempt/api/attempt.api"
import {
	ATTEMPT_IDS,
	buildAttemptDetail,
	buildStudentAttempt,
	toRawAttemptDetail,
	toRawStudentAttempt,
} from "../../../support/attempt"

const apiClientMock = vi.hoisted(() => ({
	get: vi.fn(),
	patch: vi.fn(),
	post: vi.fn(),
}))

vi.mock("@/lib/api/api.client", () => ({ apiClient: apiClientMock }))

describe("attempt API", () => {
	beforeEach(() => {
		apiClientMock.get.mockReset()
		apiClientMock.patch.mockReset()
		apiClientMock.post.mockReset()
		vi.spyOn(console, "error").mockImplementation(() => undefined)
	})

	it("URL-encodes attempt IDs and passes AbortSignal to get", async () => {
		const signal = new AbortController().signal
		apiClientMock.get.mockResolvedValue({
			data: toRawAttemptDetail(),
			headers: { etag: '"server-etag"' },
		})

		const response = await getAttempt("attempt/id?unsafe", signal)

		expect(apiClientMock.get).toHaveBeenCalledWith(
			"/api/v1/exam-attempts/attempt%2Fid%3Funsafe",
			{ signal }
		)
		expect(response.etag).toBe('"server-etag"')
		expect(response.data.status).toBe("in-progress")
		expect(response.data.exam.type).toBe("simple")
		expect(response.data.sections[0]?.kind).toBe("default")
		expect(response.data.sections[0]?.questions.map(({ type }) => type)).toEqual([
			"fill-blank",
			"multiple-choice-single",
			"multiple-choice-multiple",
			"group",
		])
	})

	it("uses revision-based ETag fallback when the response header is absent", async () => {
		apiClientMock.get.mockResolvedValue({ data: toRawAttemptDetail(), headers: {} })
		await expect(getAttempt(ATTEMPT_IDS.attempt)).resolves.toMatchObject({ etag: '"3"' })
	})

	it("patches with JSON Patch content type and If-Match without mutating operations", async () => {
		const operations = [{
			op: "replace" as const,
			path: `/answers/${ATTEMPT_IDS.fill}/textAnswer`,
			value: "new answer",
		}]
		const original = structuredClone(operations)
		apiClientMock.patch.mockResolvedValue({ data: toRawAttemptDetail(), headers: { etag: '"4"' } })

		await patchAttempt("attempt/id", '"3"', operations)

		expect(apiClientMock.patch).toHaveBeenCalledWith(
			"/api/v1/exam-attempts/attempt%2Fid",
			operations,
			{ headers: { "If-Match": '"3"', "Content-Type": "application/json-patch+json" } }
		)
		expect(operations).toEqual(original)
	})

	it.each([
		["submit", submitAttempt],
		["abandon", abandonAttempt],
	] as const)("posts %s to the transition route with If-Match", async (action, transition) => {
		apiClientMock.post.mockResolvedValue({ data: toRawAttemptDetail(), headers: { etag: '"4"' } })

		await transition("attempt/id", '"3"')

		expect(apiClientMock.post).toHaveBeenCalledWith(
			`/api/v1/exam-attempts/attempt%2Fid/${action}`,
			undefined,
			{ headers: { "If-Match": '"3"' } }
		)
	})

	it("omits absent attempt-list parameters and propagates AbortSignal", async () => {
		const signal = new AbortController().signal
		apiClientMock.get.mockResolvedValue({
			data: { items: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false } },
		})

		await getStudentExamAttempts({}, signal)

		expect(apiClientMock.get).toHaveBeenCalledWith("/api/v1/exam-attempts", { signal })
	})

	it("serializes attempt-list filters and pagination", async () => {
		apiClientMock.get.mockResolvedValue({
			data: { items: [], meta: { page: 2, pageSize: 5, totalItems: 6, totalPages: 2, hasPreviousPage: true, hasNextPage: false } },
		})
		const request = {
			status: "submitted" as const,
			examId: ATTEMPT_IDS.exam,
			sort: "created-at-desc" as const,
			page: 2,
			pageSize: 5,
		}
		const original = { ...request }

		await getStudentExamAttempts(request)

		expect(apiClientMock.get).toHaveBeenCalledWith(
			`/api/v1/exam-attempts?status=submitted&examId=${ATTEMPT_IDS.exam}&sort=created-at-desc&page=2&pageSize=5`,
			{ signal: undefined }
		)
		expect(request).toEqual(original)
	})

	it("transforms numeric enum values in attempt-list responses", async () => {
		apiClientMock.get.mockResolvedValue({
			data: {
				items: [toRawStudentAttempt(buildStudentAttempt({ status: "submitted" }))],
				meta: { page: 1, pageSize: 5, totalItems: 1, totalPages: 1, hasPreviousPage: false, hasNextPage: false },
			},
		})

		const page = await getStudentExamAttempts()

		expect(page.items[0]?.status).toBe("submitted")
	})

	it("rejects invalid details and inconsistent pagination through the response parser", async () => {
		apiClientMock.get.mockResolvedValueOnce({ data: { invalid: true }, headers: {} })
		await expect(getAttempt(ATTEMPT_IDS.attempt)).rejects.toMatchObject({ code: "invalid-response" })

		apiClientMock.get.mockResolvedValueOnce({
			data: { items: [], meta: { page: 1, pageSize: 5, totalItems: 6, totalPages: 1, hasPreviousPage: false, hasNextPage: false } },
		})
		const inconsistentPage = getStudentExamAttempts()
		await expect(inconsistentPage).rejects.toBeInstanceOf(ApiError)
		await expect(inconsistentPage).rejects.toMatchObject({ code: "invalid-response" })
	})

	it("URL-encodes exam IDs, sends the selected mode, and preserves the request object", async () => {
		const request = { mode: "exam" as const }
		apiClientMock.post.mockResolvedValue({
			data: { attemptId: ATTEMPT_IDS.attempt, mode: "exam", revision: 0 },
			headers: { etag: '"0"' },
		})

		const result = await createStudentExamAttempt("exam/id?unsafe", request)

		expect(apiClientMock.post).toHaveBeenCalledWith(
			"/api/v1/exams/exam%2Fid%3Funsafe/attempts",
			request
		)
		expect(request).toEqual({ mode: "exam" })
		expect(result).toEqual({ attemptId: ATTEMPT_IDS.attempt, mode: "exam", revision: 0, etag: '"0"' })
	})

	it("rejects an invalid create response", async () => {
		apiClientMock.post.mockResolvedValue({ data: { ...buildAttemptDetail(), attemptId: "invalid" }, headers: {} })
		await expect(createStudentExamAttempt(ATTEMPT_IDS.exam, { mode: "practice" })).rejects.toMatchObject({
			code: "invalid-response",
		})
	})
})
