import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios"
import { describe, expect, it } from "vitest"

import { ApiError, parseApiProblemDetails, toApiError } from "@/lib/api/api.error"

function axiosFailure({ status, data, code }: { status?: number; data?: unknown; code?: string }) {
	const response: AxiosResponse | undefined = status === undefined ? undefined : {
		data,
		status,
		statusText: "Failure",
		headers: {},
		config: { headers: new AxiosHeaders() },
	}

	return new AxiosError(
		"Request failed",
		code,
		{ headers: new AxiosHeaders() },
		undefined,
		response
	)
}

describe("parseApiProblemDetails", () => {
	it("parses RFC Problem Details and optional backend metadata", () => {
		const problem = parseApiProblemDetails({
			type: "https://examforge.test/problems/active-attempt",
			title: "Active attempt exists",
			status: 409,
			detail: "Continue the existing attempt.",
			instance: "/api/v1/exams/exam-1/attempts",
			code: "active_attempt_exists",
			existingAttemptId: "11111111-1111-4111-8111-111111111111",
			currentRevision: 4,
			invalidTagIds: ["22222222-2222-4222-8222-222222222222"],
		})

		expect(problem).toEqual({
			type: "https://examforge.test/problems/active-attempt",
			title: "Active attempt exists",
			status: 409,
			detail: "Continue the existing attempt.",
			instance: "/api/v1/exams/exam-1/attempts",
			code: "active_attempt_exists",
			existingAttemptId: "11111111-1111-4111-8111-111111111111",
			currentRevision: 4,
			invalidTagIds: ["22222222-2222-4222-8222-222222222222"],
		})
	})

	it("parses validation field errors", () => {
		expect(parseApiProblemDetails({ errors: {
			Email: ["Email is invalid."],
			Password: ["Password is required."],
		} })).toEqual({ errors: {
			Email: ["Email is invalid."],
			Password: ["Password is required."],
		} })
	})

	it("parses JSON Patch validation errors", () => {
		const errors = [{
			operationIndex: 2,
			path: "/answers/0",
			code: "invalid_operation",
			message: "The operation is not valid.",
		}]

		expect(parseApiProblemDetails({ errors })).toEqual({ errors })
	})

	it.each([null, "not-json", 42, ["unexpected"]])(
		"returns an empty problem for a malformed body: %j",
		(body) => expect(parseApiProblemDetails(body)).toEqual({})
	)

	it("drops malformed optional properties without exposing parser details", () => {
		expect(parseApiProblemDetails({
			title: 7,
			status: "400",
			detail: "Usable detail",
			errors: { Email: "not-an-array" },
			code: "",
			existingAttemptId: "not-a-uuid",
			invalidTagIds: ["not-a-uuid"],
			unrecognized: true,
		})).toEqual({ detail: "Usable detail" })
	})
})

describe("ApiError", () => {
	it("finds field messages case-insensitively and returns undefined for unknown fields", () => {
		const error = new ApiError({
			code: "validation",
			message: "Invalid request",
			fieldErrors: { DisplayName: ["Already used"] },
		})

		expect(error.getFieldMessages("displayname")).toEqual(["Already used"])
		expect(error.getFieldMessages("DISPLAYNAME")).toEqual(["Already used"])
		expect(error.getFieldMessages("email")).toBeUndefined()
	})

	it("exposes problem codes, attempt metadata, invalid tags, and patch errors", () => {
		const patchErrors = [{
			operationIndex: 0,
			path: null,
			code: "invalid_patch",
			message: "Invalid patch document.",
		}]
		const error = new ApiError({
			code: "conflict",
			message: "Conflict",
			problem: {
				code: "active_attempt_exists",
				existingAttemptId: "11111111-1111-4111-8111-111111111111",
				invalidTagIds: ["22222222-2222-4222-8222-222222222222"],
				errors: patchErrors,
			},
		})

		expect(error.problemCode).toBe("active_attempt_exists")
		expect(error.existingAttemptId).toBe("11111111-1111-4111-8111-111111111111")
		expect(error.invalidTagIds).toEqual(["22222222-2222-4222-8222-222222222222"])
		expect(error.patchErrors).toEqual(patchErrors)
	})
})

describe("toApiError", () => {
	it("returns an existing ApiError unchanged", () => {
		const original = new ApiError({ code: "network", message: "Offline" })
		expect(toApiError(original)).toBe(original)
	})

	it("normalizes non-Axios errors to a safe generic error", () => {
		const error = toApiError(new Error("secret implementation detail"))
		expect(error).toMatchObject({ code: "unknown", message: "Something went wrong. Please try again." })
		expect(error.message).not.toContain("secret")
	})

	it.each(["ECONNABORTED", "ETIMEDOUT"])("normalizes %s as a timeout", (code) => {
		expect(toApiError(axiosFailure({ code }))).toMatchObject({
			code: "timeout",
			message: "The request took too long. Please try again.",
		})
	})

	it("normalizes an Axios failure without a response as a network error", () => {
		expect(toApiError(axiosFailure({}))).toMatchObject({
			code: "network",
			message: "We could not reach ExamForge. Check your connection and try again.",
		})
	})

	it("normalizes validation responses and preserves field errors", () => {
		const error = toApiError(axiosFailure({
			status: 400,
			data: { detail: "Validation failed.", errors: { Email: ["Invalid email"] } },
		}))

		expect(error).toMatchObject({
			code: "validation",
			status: 400,
			message: "Validation failed.",
			fieldErrors: { Email: ["Invalid email"] },
		})
	})

	it.each([
		[401, "unauthorized", "Your session is not authorized."],
		[409, "conflict", "That information is already in use."],
		[500, "server", "The service is temporarily unavailable. Please try again later."],
		[503, "server", "The service is temporarily unavailable. Please try again later."],
	] as const)("normalizes status %i as %s", (status, code, message) => {
		expect(toApiError(axiosFailure({ status, data: {} }))).toMatchObject({ code, status, message })
	})

	it("prefers backend detail where the status allows it", () => {
		expect(toApiError(axiosFailure({
			status: 409,
			data: { detail: "An active attempt already exists." },
		})).message).toBe("An active attempt already exists.")
	})

	it("does not expose backend detail for server failures", () => {
		expect(toApiError(axiosFailure({
			status: 500,
			data: { detail: "Database password was rejected." },
		})).message).toBe("The service is temporarily unavailable. Please try again later.")
	})

	it("uses safe fallbacks for malformed response data", () => {
		expect(toApiError(axiosFailure({ status: 418, data: "an HTML error page" }))).toMatchObject({
			code: "unknown",
			message: "Something went wrong. Please try again.",
			problem: {},
		})
	})
})
