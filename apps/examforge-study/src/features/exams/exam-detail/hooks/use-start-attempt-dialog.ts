"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { useCreateExamAttempt } from "@/features/attempt/api/attempt.query"
import type { ExamAttemptMode } from "@/features/attempt/types/attempt.type"
import { AUTH_ROUTES } from "@/features/auth/auth.constants"
import { ApiError } from "@/lib/api/api.error"

export type AttemptDialogMode = "start" | "retake"

export interface AttemptStartContext {
	examId: string
	examSlug: string
	examTitle: string
	examVersionId: string
	durationMinutes: number | null
	questionCount: number
	sectionCount: number
	totalScore: number
}

export interface StartAttemptDialogController {
	dialog: {
		mode: AttemptDialogMode
		attemptMode: ExamAttemptMode
		isPending: boolean
		error: string
		existingAttemptId: string | null
	} | null
	openDialog: (mode: AttemptDialogMode) => void
	closeDialog: () => void
	setAttemptMode: (mode: ExamAttemptMode) => void
	confirmDialog: () => void
	continueExisting: () => void
}

export function useStartAttemptDialog(
	context: AttemptStartContext,
	onCreated?: () => void
): StartAttemptDialogController {
	const router = useRouter()
	const mutation = useCreateExamAttempt(context.examId)
	const [dialogMode, setDialogMode] = useState<AttemptDialogMode | null>(null)
	const [attemptMode, setAttemptModeState] = useState<ExamAttemptMode>("practice")
	const [customError, setCustomError] = useState("")
	const [existingAttemptId, setExistingAttemptId] = useState<string | null>(null)
	const signinHref = useMemo(
		() => `${AUTH_ROUTES.signin}?callbackUrl=${encodeURIComponent(`/exams/${encodeURIComponent(context.examSlug)}`)}`,
		[context.examSlug]
	)

	function openDialog(mode: AttemptDialogMode) {
		mutation.reset()
		setAttemptModeState("practice")
		setCustomError("")
		setExistingAttemptId(null)
		setDialogMode(mode)
	}

	function closeDialog() {
		if (!mutation.isPending) setDialogMode(null)
	}

	function setAttemptMode(mode: ExamAttemptMode) {
		if (context.durationMinutes == null && mode === "exam") return
		setAttemptModeState(mode)
		setCustomError("")
	}

	function confirmDialog() {
		if (!dialogMode || mutation.isPending || existingAttemptId) return
		setCustomError("")
		mutation.mutate({ mode: attemptMode }, {
			onSuccess: (attempt) => {
				onCreated?.()
				router.push(`/attempts/${attempt.attemptId}`)
			},
			onError: (error) => {
				if (!(error instanceof ApiError)) {
					setCustomError("We could not create the attempt. Please try again.")
					return
				}
				if (error.status === 401) {
					setDialogMode(null)
					router.replace(signinHref)
					return
				}
				if (error.problemCode === "active_attempt_exists" && error.existingAttemptId) {
					setExistingAttemptId(error.existingAttemptId)
					setCustomError("An in-progress attempt already exists for this exam version.")
					return
				}
				setCustomError(error.message)
			},
		})
	}

	function continueExisting() {
		if (existingAttemptId) router.push(`/attempts/${existingAttemptId}`)
	}

	return {
		dialog: dialogMode ? {
			mode: dialogMode,
			attemptMode,
			isPending: mutation.isPending,
			error: customError,
			existingAttemptId,
		} : null,
		openDialog,
		closeDialog,
		setAttemptMode,
		confirmDialog,
		continueExisting,
	}
}
