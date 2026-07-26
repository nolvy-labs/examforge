import axios from "axios"

import type {
	ApiErrorCode,
	ApiFieldErrors,
	ApiProblemDetails,
} from "@/lib/api/api.type"

const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again."

export class ApiError extends Error {
	readonly code: ApiErrorCode
	readonly status?: number
	readonly fieldErrors: ApiFieldErrors

	constructor({
		code,
		message,
		status,
		fieldErrors = {},
	}: {
		code: ApiErrorCode
		message: string
		status?: number
		fieldErrors?: ApiFieldErrors
	}) {
		super(message)
		this.name = "ApiError"
		this.code = code
		this.status = status
		this.fieldErrors = fieldErrors
	}

	getFieldMessages(fieldName: string) {
		const matchingKey = Object.keys(this.fieldErrors).find(
			(key) => key.toLocaleLowerCase() === fieldName.toLocaleLowerCase()
		)

		return matchingKey ? this.fieldErrors[matchingKey] : undefined
	}
}

function isProblemDetails(value: unknown): value is ApiProblemDetails {
	return typeof value === "object" && value !== null
}

function getProblemDetails(data: unknown): ApiProblemDetails {
	return isProblemDetails(data) ? data : {}
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
	const problem = getProblemDetails(error.response.data)
	const fieldErrors = problem.errors ?? {}
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
		message: getMessageForStatus(status, problem),
	})
}
