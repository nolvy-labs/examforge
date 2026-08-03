import type { AttemptStatus, StudentExamAttempt } from "../types/attempt.type"

const STATUS_LABELS: Record<AttemptStatus, string> = {
	"in-progress": "In progress",
	submitted: "Submitted",
	abandoned: "Abandoned",
}

export function getAttemptStatusLabel(status: AttemptStatus) {
	return STATUS_LABELS[status]
}

export function getAttemptAction(attempt: StudentExamAttempt) {
	if (attempt.status === "in-progress") {
		return { label: "Continue", href: `/attempts/${attempt.attemptId}` }
	}
	if (attempt.status === "submitted") {
		return {
			label: "Review",
			href: `/attempts/${attempt.attemptId}/result`,
		}
	}
	return {
		label: "View details",
		href: `/attempts/${attempt.attemptId}/result`,
	}
}

export function formatAttemptSummaryDate(value?: string | null) {
	if (!value) return "Unavailable"
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return "Unavailable"
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date)
}

export function formatAttemptSummaryNumber(value: number) {
	return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
		value
	)
}

export function formatAttemptSummaryScore(attempt: StudentExamAttempt) {
	if (attempt.score == null || attempt.maximumScore == null) return null
	return `${formatAttemptSummaryNumber(attempt.score)} / ${formatAttemptSummaryNumber(attempt.maximumScore)}`
}

export function deduplicateAttempts(attempts: StudentExamAttempt[]) {
	const seen = new Set<string>()
	return attempts.filter((attempt) => {
		if (seen.has(attempt.attemptId)) return false
		seen.add(attempt.attemptId)
		return true
	})
}
