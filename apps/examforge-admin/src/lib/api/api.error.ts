import axios from "axios"
import { z } from "zod"

import type {
	ApiErrorCode,
	ApiFieldErrors,
	ApiProblemDetails,
} from "@/lib/api/api.type"

const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again."

export class ApiError extends Error {
	readonly code: ApiErrorCode
	readonly status?: number
	readonly title?: string
	readonly fieldErrors: ApiFieldErrors
	readonly problem?: ApiProblemDetails
	readonly missingOrArchivedTagIds: string[]
	readonly context?: string

	constructor({
		code,
		message,
		status,
		fieldErrors = {},
		problem,
		context,
	}: {
		code: ApiErrorCode
		message: string
		status?: number
		fieldErrors?: ApiFieldErrors
		problem?: ApiProblemDetails
		context?: string
	}) {
		super(message)
		this.name = "ApiError"
		this.code = code
		this.status = status
		this.title = problem?.title
		this.fieldErrors = fieldErrors
		this.problem = problem
		this.missingOrArchivedTagIds =
			problem?.missingOrArchivedTagIds ?? []
		this.context = context
	}

	getFieldMessages(fieldName: string) {
		const matchingKey = Object.keys(this.fieldErrors).find(
			(key) => key.toLocaleLowerCase() === fieldName.toLocaleLowerCase()
		)

		return matchingKey ? this.fieldErrors[matchingKey] : undefined
	}
}

const fieldErrorsSchema = z.record(z.string(), z.array(z.string()))
const problemDetailsSchema = z.object({
	type: z.string().optional().catch(undefined),
	title: z.string().optional().catch(undefined),
	status: z.number().int().optional().catch(undefined),
	detail: z.string().optional().catch(undefined),
	instance: z.string().optional().catch(undefined),
	errors: z
		.union([fieldErrorsSchema, z.array(z.unknown())])
		.optional()
		.catch(undefined),
	missingOrArchivedTagIds: z.array(z.uuid()).optional().catch(undefined),
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

	if (status === 403) {
		return problem.detail ?? "You do not have permission to perform this action."
	}

	if (status === 404) {
		return problem.detail ?? "The requested resource was not found."
	}

	if (status === 409) {
		return problem.detail ?? "The request conflicts with the current state."
	}

	if (status === 412) {
		return problem.detail ?? "The server content has changed since it was loaded."
	}

	if (status === 428) {
		return problem.detail ?? "The request is missing a required concurrency token."
	}

	if (status >= 500) {
		return "The service is temporarily unavailable. Please try again later."
	}

	return problem.detail ?? problem.title ?? DEFAULT_ERROR_MESSAGE
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

	if (status === 400 || status === 428 || Object.keys(fieldErrors).length > 0) {
		code = "validation"
	} else if (status === 401) {
		code = "unauthorized"
	} else if (status === 403) {
		code = "forbidden"
	} else if (status === 404) {
		code = "not-found"
	} else if (status === 409 || status === 412) {
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
