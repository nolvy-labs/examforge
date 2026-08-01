"use client"

import {
	keepPreviousData,
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"
import { z } from "zod"

import { getAdminExam } from "../../api/exam.api"
import { examQueryKeys } from "../../api/exam.query-key"
import type { GetExamVersionsRequest } from "../../types/exam-version.types"
import {
	cloneAdminExamVersion,
	createEmptyAdminExamVersion,
	getAdminExamVersions,
	getCompleteAdminExamVersion,
} from "./exam-builder.api"
import {
	examBuilderMutationKeys,
	examBuilderQueryKeys,
} from "./exam-builder.query-key"

const uuidSchema = z.uuid()
const ACTIVE_VERSION_STALE_TIME = 0
const VERSION_LIST_STALE_TIME = 30_000

function isUuid(value: string) {
	return uuidSchema.safeParse(value).success
}

export function useAdminExamDetail(examId: string) {
	return useQuery({
		queryKey: examQueryKeys.detail(examId),
		queryFn: ({ signal }) => getAdminExam(examId, signal),
		enabled: isUuid(examId),
		staleTime: VERSION_LIST_STALE_TIME,
	})
}

export function useAdminExamVersions(
	examId: string,
	request: GetExamVersionsRequest
) {
	return useQuery({
		queryKey: examBuilderQueryKeys.versionList(examId, request),
		queryFn: ({ signal }) => getAdminExamVersions(examId, request, signal),
		enabled: isUuid(examId),
		placeholderData: keepPreviousData,
		staleTime: VERSION_LIST_STALE_TIME,
	})
}

export function useCompleteAdminExamVersion(examId: string, versionId: string) {
	return useQuery({
		queryKey: examBuilderQueryKeys.version(examId, versionId),
		queryFn: ({ signal }) =>
			getCompleteAdminExamVersion({ examId, versionId }, signal),
		enabled: isUuid(examId) && isUuid(versionId),
		staleTime: ACTIVE_VERSION_STALE_TIME,
		refetchOnMount: "always",
	})
}

export async function invalidateVersionControlQueries(
	queryClient: QueryClient,
	examId: string
) {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: examQueryKeys.lists() }),
		queryClient.invalidateQueries({
			queryKey: examQueryKeys.detail(examId),
			exact: true,
		}),
		queryClient.invalidateQueries({
			queryKey: examBuilderQueryKeys.versionLists(examId),
		}),
	])
}

export async function invalidatePublishedExamViews(
	queryClient: QueryClient,
	examId: string
) {
	await Promise.all([
		invalidateVersionControlQueries(queryClient, examId),
		queryClient.invalidateQueries({
			queryKey: examBuilderQueryKeys.versionDetails(examId),
		}),
	])
}

export function useCreateEmptyExamVersionMutation(examId: string) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationKey: examBuilderMutationKeys.createVersion(examId),
		mutationFn: () => createEmptyAdminExamVersion(examId),
		onSuccess: () => invalidateVersionControlQueries(queryClient, examId),
	})
}

export function useCloneExamVersionMutation(examId: string) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationKey: examBuilderMutationKeys.cloneVersion(examId),
		mutationFn: (sourceVersionId: string) =>
			cloneAdminExamVersion(examId, sourceVersionId),
		onSuccess: () => invalidateVersionControlQueries(queryClient, examId),
	})
}
