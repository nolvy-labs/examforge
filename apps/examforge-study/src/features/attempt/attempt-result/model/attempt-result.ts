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

export function getAnswerText(question: AttemptQuestion) {
	const answer = question.answer
	if (getQuestionType(question.type) === "fill-blank") {
		return answer?.textAnswer?.trim() || "Unanswered"
	}

	const selected = new Set(answer?.selectedOptionIds ?? [])
	return (
		question.options
			.filter((option) => selected.has(option.id))
			.map((option) => `${option.label ? `${option.label}. ` : ""}${option.text}`)
			.join(", ") || "Unanswered"
	)
}

export function formatAttemptDate(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value))
}

export function formatAttemptNumber(value: number) {
	return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
}
