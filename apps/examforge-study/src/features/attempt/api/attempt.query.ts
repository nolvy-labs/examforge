"use client"

import {
	keepPreviousData,
	useMutation,
	useInfiniteQuery,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"

import {
	abandonAttempt,
	createStudentExamAttempt,
	getAttempt,
	getStudentExamAttempts,
	submitAttempt,
} from "./attempt.api"
import {
	ATTEMPT_HISTORY_PAGE_SIZE,
	attemptQueryKeys,
} from "./attempt.query-key"
import type { CreateExamAttemptRequest, GetAttemptsParams } from "../types/attempt.type"
import { invalidateStatisticsAfterSubmission } from "@/features/statistics/api/statistics.key"

export function useAttempt(attemptId: string) {
	return useQuery({
		queryKey: attemptQueryKeys.detail(attemptId),
		queryFn: ({ signal }) => getAttempt(attemptId, signal),
		staleTime: 0,
		refetchOnMount: "always",
	})
}

export function useAttemptTransition(
	attemptId: string,
	action: "submit" | "abandon"
) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (etag: string) =>
			action === "submit"
				? submitAttempt(attemptId, etag)
				: abandonAttempt(attemptId, etag),
		onSuccess: async (response) => {
			queryClient.setQueryData(attemptQueryKeys.detail(attemptId), response)
			await queryClient.invalidateQueries({
				queryKey: attemptQueryKeys.lists(),
			})
			if (action === "submit") {
				await invalidateStatisticsAfterSubmission(queryClient)
			}
		},
	})
}

export function useActiveExamAttempt(examId: string, enabled: boolean) {
	return useQuery({
		queryKey: attemptQueryKeys.list({ examId, status: "in-progress", page: 1, pageSize: 1 }),
		queryFn: ({ signal }) => getStudentExamAttempts({ examId, status: "in-progress", page: 1, pageSize: 1 }, signal),
		enabled,
		staleTime: 0,
	})
}

export function useExamAttemptHistory(
	examId: string,
	page: number,
	enabled: boolean
) {
	return useQuery({
		queryKey: attemptQueryKeys.list({ examId, sort: "created-at-desc", page, pageSize: ATTEMPT_HISTORY_PAGE_SIZE }),
		queryFn: ({ signal }) =>
			getStudentExamAttempts({ examId, sort: "created-at-desc", page, pageSize: ATTEMPT_HISTORY_PAGE_SIZE }, signal),
		enabled,
		staleTime: 0,
		placeholderData: keepPreviousData,
	})
}

export function useAttempts(params: GetAttemptsParams, enabled = true) {
	return useQuery({
		queryKey: attemptQueryKeys.list(params),
		queryFn: ({ signal }) => getStudentExamAttempts(params, signal),
		enabled,
		staleTime: 0,
	})
}

export function useInfiniteAttempts(
	params: Omit<GetAttemptsParams, "page">,
	enabled = true
) {
	return useInfiniteQuery({
		queryKey: attemptQueryKeys.infinite(params),
		queryFn: ({ pageParam, signal }) =>
			getStudentExamAttempts({ ...params, page: pageParam }, signal),
		initialPageParam: 1,
		getNextPageParam: (lastPage) =>
			lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
		enabled,
		staleTime: 0,
	})
}

export function useCreateExamAttempt(examId: string) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (request: CreateExamAttemptRequest) =>
			createStudentExamAttempt(examId, request),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: attemptQueryKeys.lists(),
			})
		},
	})
}
