export type ApiFieldErrors = Record<string, string[]>

export interface ApiProblemDetails {
	type?: string
	title?: string
	status?: number
	detail?: string
	instance?: string
	errors?: ApiFieldErrors | unknown[]
	missingOrArchivedTagIds?: string[]
}

export type ApiErrorCode =
	| "configuration"
	| "validation"
	| "unauthorized"
	| "forbidden"
	| "not-found"
	| "conflict"
	| "timeout"
	| "network"
	| "server"
	| "invalid-response"
	| "unknown"
