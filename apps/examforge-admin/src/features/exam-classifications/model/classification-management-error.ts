import { ApiError } from "@/lib/api/api.error"

export function getClassificationActionErrorMessage(
	error: unknown,
	resource: "tag" | "category",
	action: "create" | "update" | "archive" | "restore"
) {
	if (!(error instanceof ApiError)) {
		return `The ${resource} could not be ${action === "create" ? "created" : action === "update" ? "updated" : `${action}d`}. Please try again.`
	}

	switch (error.code) {
		case "unauthorized":
			return "Your session is no longer authorized. Sign in again and retry."
		case "forbidden":
			return `You do not have permission to manage this ${resource}.`
		case "not-found":
			return `This ${resource} no longer exists. Refresh the list and try again.`
		case "network":
			return "ExamForge could not be reached. Check your connection and retry."
		case "timeout":
			return "The request timed out. Please retry."
		default:
			return error.message
	}
}
