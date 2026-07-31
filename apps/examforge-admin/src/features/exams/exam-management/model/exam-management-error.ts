import { ApiError } from "@/lib/api/api.error"

export function getExamActionErrorMessage(
	error: unknown,
	action: "create" | "archive" | "restore"
) {
	if (!(error instanceof ApiError)) {
		return `The exam could not be ${action === "create" ? "created" : `${action}d`}. Please try again.`
	}

	switch (error.code) {
		case "unauthorized":
			return "Your session is no longer authorized. Sign in again and retry."
		case "forbidden":
			return "You do not have permission to manage this exam."
		case "not-found":
			return "This exam no longer exists. Refresh the list and try again."
		case "conflict":
			return error.message || "The exam changed. Refresh the list and retry."
		case "validation":
			return error.message
		case "network":
			return "ExamForge could not be reached. Check your connection and retry."
		case "timeout":
			return "The request timed out. Please retry."
		case "invalid-response":
		case "server":
		case "configuration":
		case "unknown":
		default:
			return error.message
	}
}
