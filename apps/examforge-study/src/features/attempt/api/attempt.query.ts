"use client"

import {
	keepPreviousData,
	useMutation,
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
				queryKey: attemptQueryKeys.allForExam(response.data.examId),
			})
		},
	})
}

export function useActiveExamAttempt(examId: string, enabled: boolean) {
	return useQuery({
		queryKey: attemptQueryKeys.activeForExam(examId),
		queryFn: ({ signal }) => getStudentExamAttempts(examId, "in-progress", 1, 1, signal),
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
		queryKey: attemptQueryKeys.historyForExam(examId, page),
		queryFn: ({ signal }) =>
			getStudentExamAttempts(
				examId,
				"completed",
				page,
				ATTEMPT_HISTORY_PAGE_SIZE,
				signal
			),
		enabled,
		staleTime: 0,
		placeholderData: keepPreviousData,
	})
}

export function useCreateExamAttempt(examId: string) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: () => createStudentExamAttempt(examId),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: attemptQueryKeys.allForExam(examId),
			})
		},
	})
}
