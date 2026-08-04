"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { useActiveExamAttempt, useExamAttemptHistory } from "@/features/attempt/api/attempt.query"
import { AUTH_ROUTES } from "@/features/auth/auth.constants"
import { useAuthSession } from "@/features/auth/stores/auth.store"

import type { StudentExamDetail } from "../../types/exam.types"
import {
	getExamAttemptAvailability,
	type ExamAttemptAvailability,
} from "../model/exam-attempt-availability"
import { getExamCounts, getLatestAttempt } from "../model/exam-detail"
import {
	useStartAttemptDialog,
	type StartAttemptDialogController,
} from "./use-start-attempt-dialog"

export interface ExamAttemptActionsController extends StartAttemptDialogController {
	availability: ExamAttemptAvailability
	retryAvailability: () => void
}

export function useExamAttemptActions(detail: StudentExamDetail): ExamAttemptActionsController {
	const router = useRouter()
	const session = useAuthSession()
	const activeQuery = useActiveExamAttempt(detail.exam.id, session.status === "authenticated")
	const latestQuery = useExamAttemptHistory(detail.exam.id, 1, session.status === "authenticated")
	const [failedVersionId, setFailedVersionId] = useState<string | null>(null)
	const counts = getExamCounts(detail)
	const dialog = useStartAttemptDialog({
		examId: detail.exam.id,
		examSlug: detail.exam.slug,
		examTitle: detail.exam.title,
		examVersionId: detail.publishedVersion.id,
		durationMinutes: detail.publishedVersion.durationMinutes,
		questionCount: counts.questionCount,
		sectionCount: counts.sectionCount,
		totalScore: detail.publishedVersion.totalScore,
	}, () => {
		void activeQuery.refetch()
		void latestQuery.refetch()
	})
	const signinHref = useMemo(
		() => `${AUTH_ROUTES.signin}?callbackUrl=${encodeURIComponent(`/exams/${encodeURIComponent(detail.exam.slug)}`)}`,
		[detail.exam.slug]
	)

	const availability = getExamAttemptAvailability({
		authSession: session,
		signinHref,
		activeAttempt: activeQuery.data?.items[0],
		latestAttempt: getLatestAttempt(latestQuery.data?.items ?? []),
		isActivePending: activeQuery.isPending,
		isLatestPending: latestQuery.isPending,
		isActiveError: activeQuery.isError,
		isLatestError: latestQuery.isError,
		failedVersionId,
		publishedVersionId: detail.publishedVersion.id,
	})

	function retryAvailability() {
		setFailedVersionId(null)
		if (availability.kind === "error" && availability.source === "active") {
			void activeQuery.refetch()
			return
		}
		if (availability.kind === "error" && availability.source === "latest") {
			void latestQuery.refetch()
			return
		}
		void activeQuery.refetch()
		void latestQuery.refetch()
		router.refresh()
	}

	return { availability, retryAvailability, ...dialog }
}
