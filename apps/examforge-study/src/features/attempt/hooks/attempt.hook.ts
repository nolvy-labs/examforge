"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { examDetailKeys } from "@/features/exams/hooks/exam-detail.hook"

import {
	abandonAttempt,
	getAttempt,
	submitAttempt,
} from "../api/attempt.api"

export const attemptKeys = {
	detail: (attemptId: string) => ["exam-attempt", attemptId] as const,
}

export function useAttempt(attemptId: string) {
	return useQuery({
		queryKey: attemptKeys.detail(attemptId),
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
			queryClient.setQueryData(attemptKeys.detail(attemptId), response)
			await queryClient.invalidateQueries({
				queryKey: examDetailKeys.allAttempts(response.data.examId),
			})
		},
	})
}
