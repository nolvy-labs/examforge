import type {
	ExamAttemptStatus,
	StudentExamAttempt,
	StudentExamDetail,
	StudentExamSection,
} from "./exam-detail.types"

export const ATTEMPT_HISTORY_PAGE_SIZE = 5

const EXAM_TYPE_LABELS: Record<string, string> = {
	"0": "Standard exam",
	"1": "IELTS",
	simple: "Standard exam",
	ielts: "IELTS",
}

const SECTION_KIND_LABELS: Record<string, string> = {
	"0": "General",
	"1": "Reading",
	"2": "Listening",
	"3": "Writing",
	"4": "Speaking",
	"5": "Custom",
	default: "General",
	reading: "Reading",
	listening: "Listening",
	writing: "Writing",
	speaking: "Speaking",
	custom: "Custom",
}

function enumKey(value: string | number) {
	return String(value).replaceAll("_", "").replaceAll("-", "").toLowerCase()
}

export function getExamTypeLabel(type: string | number) {
	return EXAM_TYPE_LABELS[enumKey(type)] ?? "Exam"
}

export function getSectionKindLabel(kind: string | number) {
	return SECTION_KIND_LABELS[enumKey(kind)] ?? "Section"
}

export function getAttemptStatus(status: string | number): ExamAttemptStatus {
	const key = enumKey(status)
	if (key === "0" || key === "inprogress") return "in-progress"
	if (key === "1" || key === "submitted") return "submitted"
	if (key === "2" || key === "abandoned") return "abandoned"
	return "unknown"
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
		getAttemptStatus(attempt.status) !== "submitted" ||
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
