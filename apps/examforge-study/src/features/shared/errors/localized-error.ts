import { ApiError } from "@/lib/api/api.error"

export type LocalizedErrorKey =
	| "generic"
	| `backend.${"configuration" | "validation" | "unauthorized" | "conflict" | "timeout" | "network" | "server" | "invalidResponse" | "activeAttemptExists" | "revisionMismatch" | "concurrencyConflict"}`

const problemCodeKeys: Record<string, LocalizedErrorKey> = {
	active_attempt_exists: "backend.activeAttemptExists",
	revision_mismatch: "backend.revisionMismatch",
	concurrency_conflict: "backend.concurrencyConflict",
}

const apiCodeKeys: Partial<Record<ApiError["code"], LocalizedErrorKey>> = {
	configuration: "backend.configuration",
	validation: "backend.validation",
	unauthorized: "backend.unauthorized",
	conflict: "backend.conflict",
	timeout: "backend.timeout",
	network: "backend.network",
	server: "backend.server",
	"invalid-response": "backend.invalidResponse",
}

export function getLocalizedErrorKey(error: unknown): LocalizedErrorKey {
	if (!(error instanceof ApiError)) return "generic"
	if (error.problemCode && problemCodeKeys[error.problemCode]) return problemCodeKeys[error.problemCode]
	return apiCodeKeys[error.code] ?? "generic"
}

export function localizeError(error: unknown, translate: (key: LocalizedErrorKey) => string) {
	if (process.env.NODE_ENV !== "production" && error) console.error("[api] Localized API failure", error)
	return translate(getLocalizedErrorKey(error))
}

