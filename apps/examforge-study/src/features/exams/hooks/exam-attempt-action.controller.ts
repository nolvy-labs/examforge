"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { AUTH_ROUTES } from "@/features/auth/auth.constants"
import { useAuthStore } from "@/features/auth/stores/auth.store"
import { ApiError } from "@/lib/api/api.error"

import {
	useActiveExamAttempt,
	useCreateExamAttempt,
	useExamAttemptHistory,
} from "./exam-detail.hook"
import {
	createAttemptSubmissionGate,
	deriveAttemptActionState,
	type AttemptActionController,
	type AttemptDialogMode,
} from "../model/exam-attempt-action.model"
import { getLatestAttempt, isGuid } from "../model/exam-detail.model"
import type { StudentExamDetail } from "../model/exam-detail.types"

export function useExamAttemptActionController(
	detail: StudentExamDetail
): AttemptActionController {
	const router = useRouter()
	const isAuthInitialized = useAuthStore((state) => state.isInitialized)
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
	const enabled = isAuthInitialized && isAuthenticated
	const activeQuery = useActiveExamAttempt(detail.exam.id, enabled)
	const latestQuery = useExamAttemptHistory(detail.exam.id, 1, enabled)
	const mutation = useCreateExamAttempt(detail.exam.id)
	const submissionGate = useRef(createAttemptSubmissionGate())
	const [dialogMode, setDialogMode] = useState<AttemptDialogMode | null>(null)
	const [failedVersionId, setFailedVersionId] = useState<string | null>(null)
	const [customError, setCustomError] = useState("")
	const signinHref = `${AUTH_ROUTES.signin}?callbackUrl=${encodeURIComponent(
		`/exams/${encodeURIComponent(detail.exam.slug)}`
	)}`

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

	const state = deriveAttemptActionState({
		isAuthInitialized,
		isAuthenticated,
		signinHref,
		activeAttempt: activeQuery.data?.items[0],
		latestAttempt: getLatestAttempt(latestQuery.data?.items ?? []),
		isActivePending: activeQuery.isPending,
		isLatestPending: latestQuery.isPending,
		isActiveError: activeQuery.isError,
		isLatestError: latestQuery.isError,
		failedVersionId,
		publishedVersionId: detail.publishedVersion.id,
		retryActive: () => void activeQuery.refetch(),
		retryLatest: () => void latestQuery.refetch(),
		retryAvailability,
	})

	return {
		detail,
		state,
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
