"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import {
	useActiveExamAttempt,
	useCreateExamAttempt,
	useExamAttemptHistory,
} from "@/features/attempt/api/attempt.query"
import { AUTH_ROUTES } from "@/features/auth/auth.constants"
import { useAuthSession } from "@/features/auth/stores/auth.store"
import { ApiError } from "@/lib/api/api.error"

import type { StudentExamDetail } from "../../types/exam.types"
import {
	createAttemptSubmissionGate,
	getExamAttemptAvailability,
	type ExamAttemptAvailability,
} from "../model/exam-attempt-availability"
import { getLatestAttempt, isGuid } from "../model/exam-detail"

export type AttemptDialogMode = "start" | "retake"

export interface ExamAttemptActionsController {
	availability: ExamAttemptAvailability
	dialog: {
		mode: AttemptDialogMode
		isPending: boolean
		error: string
	} | null
	openDialog: (mode: AttemptDialogMode) => void
	closeDialog: () => void
	confirmDialog: () => void
	retryAvailability: () => void
}

export function useExamAttemptActions(detail: StudentExamDetail): ExamAttemptActionsController {
	const router = useRouter()
	
	const session = useAuthSession()
	const activeQuery = useActiveExamAttempt(detail.exam.id, session.status === "authenticated")
	const latestQuery = useExamAttemptHistory(detail.exam.id, 1, session.status === "authenticated")

	const mutation = useCreateExamAttempt(detail.exam.id)
	const submissionGate = useRef(createAttemptSubmissionGate())

	const [dialogMode, setDialogMode] = useState<AttemptDialogMode | null>(null)
	const [failedVersionId, setFailedVersionId] = useState<string | null>(null)
	const [customError, setCustomError] = useState("")
	
	const signinHref = useMemo(() =>
		`${AUTH_ROUTES.signin}?callbackUrl=${encodeURIComponent(`/exams/${encodeURIComponent(detail.exam.slug)}`)}`
	, [detail.exam.slug])

	function refreshAttemptState() {
		void activeQuery.refetch()
		void latestQuery.refetch()
	}

	function retryAvailability() {
		setFailedVersionId(null)
		setCustomError("")
		refreshAttemptState()
		router.refresh()
	}

	function openDialog(mode: AttemptDialogMode) {
		mutation.reset()
		setCustomError("")
		setDialogMode(mode)
	}

	function closeDialog() {
		if (!mutation.isPending) setDialogMode(null)
	}

	function confirmDialog() {
		if (!dialogMode || mutation.isPending) return

		submissionGate.current.run((release) => {
			setCustomError("")
			mutation.mutate(undefined, {
				onSuccess: (attempt) => {
					router.push(`/attempts/${attempt.attemptId}`)
				},
				onError: (error) => {
					if (!(error instanceof ApiError)) return
					if (error.status === 401) {
						setDialogMode(null)
						router.replace(signinHref)
						return
					}
					if (error.problemCode === "active_attempt_exists") {
						setDialogMode(null)
						refreshAttemptState()
						if (isGuid(error.existingAttemptId)) {
							router.replace(`/attempts/${error.existingAttemptId}`)
						}
						return
					}
					if (error.problemCode === "published_version_not_found") {
						setDialogMode(null)
						setFailedVersionId(detail.publishedVersion.id)
						router.refresh()
						return
					}
					if (error.problemCode === "concurrency_conflict") {
						setCustomError(
							"Your attempt status changed. Refreshing it now; please try again."
						)
						refreshAttemptState()
					}
				},
				onSettled: release,
			})
		})
	}

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

	function retryForAvailability() {
		if (availability.kind === "error") {
			if (availability.source === "active") {
				void activeQuery.refetch()
				return
			}
			if (availability.source === "latest") {
				void latestQuery.refetch()
				return
			}
		}
		retryAvailability()
	}

	return {
		availability,
		dialog: dialogMode
			? {
					mode: dialogMode,
					isPending: mutation.isPending,
					error: customError || getMutationMessage(mutation.error),
				}
			: null,
		openDialog,
		closeDialog,
		confirmDialog,
		retryAvailability: retryForAvailability,
	}
}

function getMutationMessage(error: unknown) {
	if (!(error instanceof ApiError)) return ""
	if (
		error.problemCode === "active_attempt_exists" ||
		error.problemCode === "published_version_not_found"
	) {
		return ""
	}
	return error.message
}
