import { toAdminExamListRequest } from "../exam-management/model/exam-management-query"
import type { ExamManagementQueryState } from "../exam-management/model/exam-management-query"

function normalizeListKey(state: ExamManagementQueryState) {
	const request = toAdminExamListRequest(state)

	return {
		page: request.page,
		pageSize: request.pageSize,
		search: request.search?.trim() || null,
		tagIds: Array.from(
			new Set(request.tagIds.map((tagId) => tagId.toLowerCase()))
		).sort(),
		type: request.type,
		archive: request.archive,
		sort: request.sort,
	}
}

export const examQueryKeys = {
	all: ["admin-exams"] as const,
	lists: () => [...examQueryKeys.all, "lists"] as const,
	list: (state: ExamManagementQueryState) =>
		[...examQueryKeys.lists(), normalizeListKey(state)] as const,
	details: () => [...examQueryKeys.all, "details"] as const,
	detail: (id: string) => [...examQueryKeys.details(), id] as const,
}

export const examMutationKeys = {
	create: ["admin-exams", "create"] as const,
	archive: ["admin-exams", "archive"] as const,
	restore: ["admin-exams", "restore"] as const,
}
