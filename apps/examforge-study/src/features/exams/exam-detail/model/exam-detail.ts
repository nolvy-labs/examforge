import type { StudentExamAttempt } from "@/features/attempt/types/attempt.type"

import type {
	StudentExamDetail,
	StudentExamSection,
} from "../../types/exam.types"

export function getOrderedSections(detail: StudentExamDetail) {
	return [...detail.sections].sort(
		(left, right) => left.displayOrder - right.displayOrder
	)
}

export function getExamCounts(detail: StudentExamDetail) {
	return {
		sectionCount: detail.sections.length,
		questionCount: detail.sections.reduce(
			(total, section) => total + section.questionCount,
			0
		),
	}
}

export function formatNumber(value: number, locale = "en") {
	return new Intl.NumberFormat(locale, {
		maximumFractionDigits: 2,
	}).format(value)
}

export function formatDate(value: string, includeTime = true, locale = "en", unavailable = "—") {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return unavailable
	return new Intl.DateTimeFormat(locale, {
		dateStyle: "medium",
		...(includeTime ? { timeStyle: "short" as const } : {}),
	}).format(date)
}

export function formatAttemptScore(attempt: StudentExamAttempt, locale = "en") {
	if (
		attempt.status !== "submitted" ||
		attempt.score == null ||
		attempt.maximumScore == null
	) {
		return null
	}
	return `${formatNumber(attempt.score, locale)} / ${formatNumber(attempt.maximumScore, locale)}`
}

export function isGuid(value: unknown): value is string {
	return (
		typeof value === "string" &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			value
		)
	)
}

export function getLatestAttempt(attempts: StudentExamAttempt[]) {
	return attempts[0]
}

export function getSectionFacts(
	section: StudentExamSection,
	locale: string,
	translate: (key: "questions" | "points", values: { count: number | string }) => string
) {
	return `${translate("questions", { count: section.questionCount })} · ${translate("points", { count: formatNumber(section.totalPoints, locale) })}`
}
