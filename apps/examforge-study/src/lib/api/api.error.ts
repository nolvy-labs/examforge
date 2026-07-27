import axios from "axios"
import { z } from "zod"

import type {
	ApiErrorCode,
	ApiFieldErrors,
	ApiPatchValidationError,
	ApiProblemDetails,
} from "@/lib/api/api.type"

const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again."

export class ApiError extends Error {
	readonly code: ApiErrorCode
	readonly status?: number
	readonly fieldErrors: ApiFieldErrors
	readonly problem?: ApiProblemDetails
	readonly problemCode?: string
	readonly existingAttemptId?: string
	readonly invalidTagIds: string[]
	readonly patchErrors: ApiPatchValidationError[]

	constructor({
		code,
		message,
		status,
		fieldErrors = {},
		problem,
	}: {
		code: ApiErrorCode
		message: string
		status?: number
		fieldErrors?: ApiFieldErrors
		problem?: ApiProblemDetails
	}) {
		super(message)
		this.name = "ApiError"
		this.code = code
		this.status = status
		this.fieldErrors = fieldErrors
		this.problem = problem
		this.problemCode = problem?.code
		this.existingAttemptId = problem?.existingAttemptId
		this.invalidTagIds = problem?.invalidTagIds ?? []
		this.patchErrors = Array.isArray(problem?.errors) ? problem.errors : []
	}

	getFieldMessages(fieldName: string) {
		const matchingKey = Object.keys(this.fieldErrors).find(
			(key) => key.toLocaleLowerCase() === fieldName.toLocaleLowerCase()
		)

		return matchingKey ? this.fieldErrors[matchingKey] : undefined
	}
}

const fieldErrorsSchema = z.record(z.string(), z.array(z.string()))
const patchErrorsSchema = z.array(z.object({
	operationIndex: z.number().int().nonnegative(),
	path: z.string().nullable(),
	code: z.string().min(1),
	message: z.string(),
}))
const problemDetailsSchema = z.object({
	type: z.string().optional().catch(undefined),
	title: z.string().optional().catch(undefined),
	status: z.number().int().optional().catch(undefined),
	detail: z.string().optional().catch(undefined),
	instance: z.string().optional().catch(undefined),
	errors: z.union([fieldErrorsSchema, patchErrorsSchema]).optional().catch(undefined),
	code: z.string().min(1).optional().catch(undefined),
	existingAttemptId: z.uuid().optional().catch(undefined),
	currentRevision: z.number().int().nonnegative().optional().catch(undefined),
	invalidTagIds: z.array(z.uuid()).optional().catch(undefined),
})

export function parseApiProblemDetails(data: unknown): ApiProblemDetails {
	const result = problemDetailsSchema.safeParse(data)
	return result.success ? result.data : {}
}

function getMessageForStatus(status: number, problem: ApiProblemDetails) {
	if (status === 400) {
		return problem.detail ?? "Please check the information you entered."
	}

	if (status === 401) {
		return problem.detail ?? "Your session is not authorized."
	}

	if (status === 409) {
		return problem.detail ?? "That information is already in use."
	}

	if (status >= 500) {
		return "The service is temporarily unavailable. Please try again later."
	}

	return problem.detail ?? DEFAULT_ERROR_MESSAGE
}

export function toApiError(error: unknown): ApiError {
	if (error instanceof ApiError) {
		return error
	}

	if (!axios.isAxiosError(error)) {
		return new ApiError({
			code: "unknown",
			message: DEFAULT_ERROR_MESSAGE,
		})
	}

	if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
		return new ApiError({
			code: "timeout",
			message: "The request took too long. Please try again.",
		})
	}

	if (!error.response) {
		return new ApiError({
			code: "network",
			message:
				"We could not reach ExamForge. Check your connection and try again.",
		})
	}

	const status = error.response.status
	const problem = parseApiProblemDetails(error.response.data)
	const fieldErrors =
		problem.errors && !Array.isArray(problem.errors) ? problem.errors : {}
	let code: ApiErrorCode = "unknown"

	if (Object.keys(fieldErrors).length > 0) {
		code = "validation"
	} else if (status === 401) {
		code = "unauthorized"
	} else if (status === 409) {
		code = "conflict"
	} else if (status >= 500) {
		code = "server"
	}

	return new ApiError({
		code,
		status,
		fieldErrors,
		problem,
		message: getMessageForStatus(status, problem),
	})
}
