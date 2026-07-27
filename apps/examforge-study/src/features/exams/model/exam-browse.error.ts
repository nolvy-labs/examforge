import { ApiError } from "@/lib/api/api.error"

export function isInvalidExamCategoryError(error: unknown) {
	// The backend's student exam page endpoint currently reserves 404 for
	// StudentExamError.CategoryNotFound.
	return error instanceof ApiError && error.status === 404
}

export function getInvalidExamTagIds(error: unknown) {
	return error instanceof ApiError ? error.invalidTagIds : []
}
