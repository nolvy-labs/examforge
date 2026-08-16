import type { AttemptQuestion } from "../../types/attempt.type"
import { getQuestionType } from "../../types/attempt.type"

export function getElapsedMinutes(startedAt: string, finishedAt?: string | null) {
	if (!finishedAt) return null

	return Math.max(
		0,
		Math.round(
			(new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000
		)
	)
}

export function getAnswerText(question: AttemptQuestion, unanswered = "-") {
	const answer = question.answer
	if (getQuestionType(question.type) === "fill-blank") {
		return answer?.textAnswer?.trim() || unanswered
	}

	const selected = new Set(answer?.selectedOptionIds ?? [])
	return (
		question.options
			.filter((option) => selected.has(option.id))
			.map((option) => `${option.label ? `${option.label}. ` : ""}${option.text}`)
			.join("\n") || unanswered
	)
}

export function formatAttemptDate(value: string, locale = "en") {
	return new Intl.DateTimeFormat(locale, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value))
}

export function formatAttemptNumber(value: number, locale = "en") {
	return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
}
