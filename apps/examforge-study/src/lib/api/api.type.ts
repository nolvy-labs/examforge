export type ApiFieldErrors = Record<string, string[]>
export interface ApiPatchValidationError {
	operationIndex: number
	path: string | null
	code: string
	message: string
}

export interface ApiProblemDetails {
	type?: string
	title?: string
	status?: number
	detail?: string
	instance?: string
	errors?: ApiFieldErrors | ApiPatchValidationError[]
	code?: string
	existingAttemptId?: string
	currentRevision?: number
	invalidTagIds?: string[]
}

export type ApiErrorCode =
	| "configuration"
	| "validation"
	| "unauthorized"
	| "conflict"
	| "timeout"
	| "network"
	| "server"
	| "invalid-response"
	| "unknown"
