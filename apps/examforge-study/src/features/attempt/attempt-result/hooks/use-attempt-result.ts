"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { ApiError } from "@/lib/api/api.error"

import { useAttempt, useCreateExamAttempt } from "../../api/attempt.query"
import { getAttemptStatus } from "../../types/attempt.type"
import { getElapsedMinutes } from "../model/attempt-result"

export function useAttemptResult(attemptId: string) {
	const router = useRouter()
	const query = useAttempt(attemptId)
	const detail = query.data?.data
	const retake = useCreateExamAttempt(detail?.examId ?? "")

	useEffect(() => {
		if (!detail || query.isFetching) return
		if (getAttemptStatus(detail.status) === "in-progress") {
			router.replace(`/attempts/${attemptId}`)
			return
		}
		document.title = `${detail.exam.title} | Attempt Result`
	}, [attemptId, detail, query.isFetching, router])

	const status = detail ? getAttemptStatus(detail.status) : null
	const submitted = status === "submitted"
	const finishedAt = detail
		? submitted
			? detail.submittedAtUtc
			: detail.abandonedAtUtc
		: null

	function createRetake() {
		if (retake.isPending) return
		retake.mutate(undefined, {
			onSuccess: (attempt) => router.push(`/attempts/${attempt.attemptId}`),
			onError: (error) => {
				if (
					error instanceof ApiError &&
					error.problemCode === "active_attempt_exists" &&
					error.existingAttemptId
				) {
					router.push(`/attempts/${error.existingAttemptId}`)
				}
			},
		})
	}

	return {
		query,
		detail,
		status,
		submitted,
		finishedAt,
		elapsedMinutes: detail
			? getElapsedMinutes(detail.startedAtUtc, finishedAt)
			: null,
		retake: {
			isPending: retake.isPending,
			create: createRetake,
		},
	}
}
