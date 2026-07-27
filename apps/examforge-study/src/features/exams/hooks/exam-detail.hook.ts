import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"

import {
	createStudentExamAttempt,
	getStudentExamAttempts,
} from "../api/exam-detail.api"
import { ATTEMPT_HISTORY_PAGE_SIZE } from "../model/exam-detail.model"

export const examDetailKeys = {
	activeAttempt: (examId: string) =>
		["student-exam-attempts", examId, "in-progress", 1, 1] as const,
	history: (examId: string, page: number) =>
		[
			"student-exam-attempts",
			examId,
			"completed",
			page,
			ATTEMPT_HISTORY_PAGE_SIZE,
		] as const,
	allAttempts: (examId: string) =>
		["student-exam-attempts", examId] as const,
}

export function useActiveExamAttempt(examId: string, enabled: boolean) {
	return useQuery({
		queryKey: examDetailKeys.activeAttempt(examId),
		queryFn: ({ signal }) =>
			getStudentExamAttempts(examId, "in-progress", 1, 1, signal),
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
		queryKey: examDetailKeys.history(examId, page),
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
				queryKey: examDetailKeys.allAttempts(examId),
			})
		},
	})
}
