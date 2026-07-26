export type ApiFieldErrors = Record<string, string[]>

export interface ApiProblemDetails {
	type?: string
	title?: string
	status?: number
	detail?: string
	instance?: string
	errors?: ApiFieldErrors
	[extension: string]: unknown
}

export type ApiErrorCode =
	| "configuration"
	| "validation"
	| "unauthorized"
	| "conflict"
	| "timeout"
	| "network"
	| "server"
	| "unknown"
