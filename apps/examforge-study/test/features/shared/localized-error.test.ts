import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	getLocalizedErrorKey,
	localizeError,
} from "@/features/shared/errors/localized-error"
import { ApiError, type ApiError as ApiErrorType } from "@/lib/api/api.error"

function apiError(
	code: ApiErrorType["code"],
	problemCode?: string
) {
	return new ApiError({
		code,
		message: "Failure",
		problem: problemCode ? { code: problemCode } : undefined,
	})
}

describe("getLocalizedErrorKey", () => {
	it.each([
		[null, "generic"],
		[new Error("failure"), "generic"],
		[apiError("configuration"), "backend.configuration"],
		[apiError("validation"), "backend.validation"],
		[apiError("unauthorized"), "backend.unauthorized"],
		[apiError("conflict"), "backend.conflict"],
		[apiError("timeout"), "backend.timeout"],
		[apiError("network"), "backend.network"],
		[apiError("server"), "backend.server"],
		[apiError("invalid-response"), "backend.invalidResponse"],
		[apiError("unknown"), "generic"],
		[apiError("conflict", "active_attempt_exists"), "backend.activeAttemptExists"],
		[apiError("conflict", "revision_mismatch"), "backend.revisionMismatch"],
		[apiError("conflict", "concurrency_conflict"), "backend.concurrencyConflict"],
	] as const)("maps an error to %s", (error, expected) => {
		expect(getLocalizedErrorKey(error)).toBe(expected)
	})

	it("gives a recognized problem code precedence over the API code", () => {
		expect(getLocalizedErrorKey(apiError("server", "active_attempt_exists"))).toBe(
			"backend.activeAttemptExists"
		)
	})

	it("falls back to the API code for an unknown problem code", () => {
		expect(getLocalizedErrorKey(apiError("conflict", "future_problem"))).toBe(
			"backend.conflict"
		)
	})
})

describe("localizeError", () => {
	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => undefined)
	})

	it("passes the resolved key to the translator", () => {
		const translate = vi.fn((key: string) => `translated:${key}`)
		const error = apiError("network")

		expect(localizeError(error, translate)).toBe("translated:backend.network")
		expect(translate).toHaveBeenCalledWith("backend.network")
	})

	it("logs a useful diagnostic outside production", () => {
		vi.stubEnv("NODE_ENV", "test")
		const error = apiError("server")

		localizeError(error, (key) => key)

		expect(console.error).toHaveBeenCalledWith("[api] Localized API failure", error)
	})

	it("does not log the development diagnostic in production", () => {
		vi.stubEnv("NODE_ENV", "production")

		localizeError(apiError("server"), (key) => key)

		expect(console.error).not.toHaveBeenCalled()
	})
})
