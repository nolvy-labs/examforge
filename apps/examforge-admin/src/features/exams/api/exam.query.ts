"use client"

import {
	keepPreviousData,
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"

import { ApiError } from "@/lib/api/api.error"

import {
	toAdminExamListRequest,
	type ExamManagementQueryState,
} from "../exam-management/model/exam-management-query"
import type { CreateExamRequest } from "../types/exam.types"
import {
	archiveAdminExam,
	createAdminExam,
	getAdminExams,
	getAdminExamTags,
	restoreAdminExam,
} from "./exam.api"
import { examMutationKeys, examQueryKeys } from "./exam.query-key"

const EXAM_LIST_STALE_TIME = 30 * 1_000
const TAG_METADATA_STALE_TIME = 15 * 60 * 1_000

export function invalidateAdminExamLists(queryClient: QueryClient) {
	return queryClient.invalidateQueries({ queryKey: examQueryKeys.lists() })
}

export function invalidateAdminExamTags(queryClient: QueryClient) {
	return queryClient.invalidateQueries({ queryKey: examQueryKeys.tags() })
}

export function useAdminExams(state: ExamManagementQueryState) {
	return useQuery({
		queryKey: examQueryKeys.list(state),
		queryFn: ({ signal }) =>
			getAdminExams(toAdminExamListRequest(state), signal),
		placeholderData: keepPreviousData,
		staleTime: EXAM_LIST_STALE_TIME,
	})
}

export function useAdminExamTags() {
	return useQuery({
		queryKey: examQueryKeys.tags(),
		queryFn: ({ signal }) => getAdminExamTags(signal),
		staleTime: TAG_METADATA_STALE_TIME,
	})
}

export function useCreateAdminExamMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: examMutationKeys.create,
		mutationFn: (request: CreateExamRequest) => createAdminExam(request),
		onSuccess: () => invalidateAdminExamLists(queryClient),
		onError: (error) => {
			if (
				error instanceof ApiError &&
				error.missingOrArchivedTagIds.length > 0
			) {
				void invalidateAdminExamTags(queryClient)
			}
		},
	})
}

export function useArchiveAdminExamMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: examMutationKeys.archive,
		mutationFn: (id: string) => archiveAdminExam(id),
		onSuccess: () => invalidateAdminExamLists(queryClient),
	})
}

export function useRestoreAdminExamMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: examMutationKeys.restore,
		mutationFn: (id: string) => restoreAdminExam(id),
		onSuccess: () => invalidateAdminExamLists(queryClient),
	})
}
