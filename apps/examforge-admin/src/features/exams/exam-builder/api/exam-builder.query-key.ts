import type { GetExamVersionsRequest } from "../../types/exam-version.types"
import { examQueryKeys } from "../../api/exam.query-key"

function normalizeVersionListRequest(request: GetExamVersionsRequest) {
	return {
		page: request.page,
		pageSize: request.pageSize,
		status: request.status ?? null,
		sort: request.sort,
	}
}

export const examBuilderQueryKeys = {
	versions: (examId: string) =>
		[...examQueryKeys.detail(examId), "versions"] as const,
	versionLists: (examId: string) =>
		[...examBuilderQueryKeys.versions(examId), "lists"] as const,
	versionList: (examId: string, request: GetExamVersionsRequest) =>
		[
			...examBuilderQueryKeys.versionLists(examId),
			normalizeVersionListRequest(request),
		] as const,
	versionDetails: (examId: string) =>
		[...examBuilderQueryKeys.versions(examId), "details"] as const,
	version: (examId: string, versionId: string) =>
		[...examBuilderQueryKeys.versionDetails(examId), versionId] as const,
}

export const examBuilderMutationKeys = {
	createVersion: (examId: string) =>
		[...examBuilderQueryKeys.versions(examId), "create"] as const,
	cloneVersion: (examId: string) =>
		[...examBuilderQueryKeys.versions(examId), "clone"] as const,
	saveVersion: (examId: string, versionId: string) =>
		[...examBuilderQueryKeys.version(examId, versionId), "save"] as const,
	publishVersion: (examId: string, versionId: string) =>
		[...examBuilderQueryKeys.version(examId, versionId), "publish"] as const,
}
