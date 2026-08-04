"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useStartAttemptDialog } from "@/features/exams/exam-detail/hooks/use-start-attempt-dialog"

import { useAttempt } from "../../api/attempt.query"
import { flattenAnswerableQuestions, getAttemptStatus } from "../../types/attempt.type"
import { getElapsedMinutes } from "../model/attempt-result"

export function useAttemptResult(attemptId: string) {
	const router = useRouter()
	const query = useAttempt(attemptId)
	const detail = query.data?.data
	const retake = useStartAttemptDialog({
		examId: detail?.examId ?? "",
		examSlug: detail?.exam.slug ?? "",
		examTitle: detail?.exam.title ?? "",
		examVersionId: detail?.examVersionId ?? "",
		durationMinutes: detail?.examVersion.durationMinutes ?? null,
		questionCount: detail ? flattenAnswerableQuestions(detail.sections).length : 0,
		sectionCount: detail?.sections.length ?? 0,
		totalScore: detail?.maximumScore ??
			(detail ? flattenAnswerableQuestions(detail.sections).reduce((total, question) => total + question.points, 0) : 0),
	})

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

	return {
		query,
		detail,
		status,
		submitted,
		finishedAt,
		elapsedMinutes: detail && detail.mode === "exam"
			? getElapsedMinutes(detail.startedAtUtc, finishedAt)
			: null,
		retake,
	}
}
