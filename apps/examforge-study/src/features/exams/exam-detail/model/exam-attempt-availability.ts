import type { StudentExamAttempt } from "@/features/attempt/types/attempt.type"
import { AuthSession } from "@/features/auth/stores/auth.store";

export type ExamAttemptAvailability =
	| { kind: "initializing" }
	| { kind: "sign-in"; href: string }
	| { kind: "continue"; href: string }
	| { kind: "start" }
	| { kind: "result"; href: string }
	| { kind: "retake" }
	| { kind: "unavailable" }
	| {
			kind: "error"
			source: "active" | "latest" | "unexpected"
			messageKey: "activeCheckError" | "latestCheckError" | "unexpectedAttemptStatus"
		}

export interface ExamAttemptAvailabilityInput {
	authSession: AuthSession
	signinHref: string
	activeAttempt?: StudentExamAttempt
	latestAttempt?: StudentExamAttempt
	isActivePending: boolean
	isLatestPending: boolean
	isActiveError: boolean
	isLatestError: boolean
	failedVersionId: string | null
	publishedVersionId: string
}

export function getExamAttemptAvailability(attemptAvailabilityInput: ExamAttemptAvailabilityInput): ExamAttemptAvailability {
	const {
		authSession,
		signinHref,
		activeAttempt,
		latestAttempt,
		isActivePending,
		isLatestPending,
		isActiveError,
		isLatestError,
		failedVersionId,
		publishedVersionId,
	} = attemptAvailabilityInput

	if (authSession.status === "loading") return { kind: "initializing" }
	if (authSession.status === "guest") return { kind: "sign-in", href: signinHref }
	if (isActivePending) return { kind: "initializing" }
	if (isActiveError) {
		return {
			kind: "error",
			source: "active",
			messageKey: "activeCheckError",
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
			source: "latest",
			messageKey: "latestCheckError",
		}
	}
	if (failedVersionId === publishedVersionId) return { kind: "unavailable" }
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
		source: "unexpected",
		messageKey: "unexpectedAttemptStatus",
	}
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
