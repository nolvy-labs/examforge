import type {
	StudentExamAttempt,
	StudentExamDetail,
} from "./exam-detail.types"

export type AttemptActionState =
	| { kind: "initializing" }
	| { kind: "sign-in"; href: string }
	| { kind: "continue"; href: string }
	| { kind: "start" }
	| { kind: "result"; href: string }
	| { kind: "retake" }
	| { kind: "unavailable"; retry: () => void }
	| { kind: "error"; message: string; retry: () => void }

export interface AttemptActionInputs {
	isAuthInitialized: boolean
	isAuthenticated: boolean
	signinHref: string
	activeAttempt?: StudentExamAttempt
	latestAttempt?: StudentExamAttempt
	isActivePending: boolean
	isLatestPending: boolean
	isActiveError: boolean
	isLatestError: boolean
	failedVersionId: string | null
	publishedVersionId: string
	retryActive: () => void
	retryLatest: () => void
	retryAvailability: () => void
}

export function deriveAttemptActionState({
	isAuthInitialized,
	isAuthenticated,
	signinHref,
	activeAttempt,
	latestAttempt,
	isActivePending,
	isLatestPending,
	isActiveError,
	isLatestError,
	failedVersionId,
	publishedVersionId,
	retryActive,
	retryLatest,
	retryAvailability,
}: AttemptActionInputs): AttemptActionState {
	if (!isAuthInitialized) return { kind: "initializing" }
	if (!isAuthenticated) return { kind: "sign-in", href: signinHref }
	if (isActivePending) return { kind: "initializing" }
	if (isActiveError) {
		return {
			kind: "error",
			message:
				"We couldn’t check for an active attempt. Starting is disabled until your status is known.",
			retry: retryActive,
		}
	}
	if (activeAttempt) {
		return {
			kind: "continue",
			href: `/attempts/${activeAttempt.attemptId}`,
		}
	}
	if (isLatestPending) return { kind: "initializing" }
	if (isLatestError) {
		return {
			kind: "error",
			message:
				"We couldn’t determine your latest attempt. Try again before starting.",
			retry: retryLatest,
		}
	}
	if (failedVersionId === publishedVersionId) {
		return { kind: "unavailable", retry: retryAvailability }
	}
	if (!latestAttempt) return { kind: "start" }
	if (latestAttempt.status === "submitted") {
		return {
			kind: "result",
			href: `/attempts/${latestAttempt.attemptId}/result`,
		}
	}
	if (latestAttempt.status === "abandoned") return { kind: "retake" }

	return {
		kind: "error",
		message: "Your latest attempt has an unexpected active status.",
		retry: retryAvailability,
	}
}

export type AttemptDialogMode = "start" | "retake"

export interface AttemptActionController {
	detail: StudentExamDetail
	state: AttemptActionState
	dialog: {
		mode: AttemptDialogMode
		isPending: boolean
		error: string
	} | null
	openDialog: (mode: AttemptDialogMode) => void
	closeDialog: () => void
	confirmDialog: () => void
}

export function createAttemptSubmissionGate() {
	let isSubmitting = false

	return {
		run(submit: (release: () => void) => void) {
			if (isSubmitting) return false
			isSubmitting = true
			const release = () => {
				isSubmitting = false
			}
			try {
				submit(release)
			} catch (error) {
				release()
				throw error
			}
			return true
		},
	}
}
