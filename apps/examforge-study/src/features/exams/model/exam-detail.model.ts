import type {
	StudentExamAttempt,
	StudentExamDetail,
	StudentExamSection,
} from "./exam-detail.types"

export const ATTEMPT_HISTORY_PAGE_SIZE = 5

const EXAM_TYPE_LABELS = {
	simple: "Standard exam",
	ielts: "IELTS",
} as const

const SECTION_KIND_LABELS = {
	default: "General",
	reading: "Reading",
	listening: "Listening",
	writing: "Writing",
	speaking: "Speaking",
	custom: "Custom",
} as const

export function getExamTypeLabel(type: StudentExamDetail["exam"]["type"]) {
	return EXAM_TYPE_LABELS[type]
}

export function getSectionKindLabel(kind: StudentExamSection["kind"]) {
	return SECTION_KIND_LABELS[kind]
}

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

export function formatNumber(value: number) {
	return new Intl.NumberFormat(undefined, {
		maximumFractionDigits: 2,
	}).format(value)
}

export function formatAttemptScore(attempt: StudentExamAttempt) {
	if (
		attempt.status !== "submitted" ||
		attempt.score == null ||
		attempt.maximumScore == null
	) {
		return null
	}
	return `${formatNumber(attempt.score)} / ${formatNumber(attempt.maximumScore)}`
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

export function getSectionFacts(section: StudentExamSection) {
	return `${section.questionCount} ${
		section.questionCount === 1 ? "question" : "questions"
	} · ${formatNumber(section.totalPoints)} ${
		section.totalPoints === 1 ? "point" : "points"
	}`
}
