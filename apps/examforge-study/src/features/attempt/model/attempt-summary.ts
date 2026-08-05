import type { StudentExamAttempt } from "../types/attempt.type"

export function getAttemptActionHref(attempt: StudentExamAttempt) {
	if (attempt.status === "in-progress") {
		return `/attempts/${attempt.attemptId}`
	}
	return `/attempts/${attempt.attemptId}/result`
}

export function formatAttemptSummaryDate(value?: string | null, locale = "en", unavailable = "—") {
	if (!value) return unavailable
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return unavailable
	return new Intl.DateTimeFormat(locale, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date)
}

export function formatAttemptSummaryNumber(value: number, locale = "en") {
	return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
		value
	)
}

export function formatAttemptSummaryScore(attempt: StudentExamAttempt, locale = "en") {
	if (attempt.score == null || attempt.maximumScore == null) return null
	return `${formatAttemptSummaryNumber(attempt.score, locale)} / ${formatAttemptSummaryNumber(attempt.maximumScore, locale)}`
}

export function deduplicateAttempts(attempts: StudentExamAttempt[]) {
	const seen = new Set<string>()
	return attempts.filter((attempt) => {
		if (seen.has(attempt.attemptId)) return false
		seen.add(attempt.attemptId)
		return true
	})
}
