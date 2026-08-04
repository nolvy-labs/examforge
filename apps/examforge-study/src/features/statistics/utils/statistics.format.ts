export function formatPercentage(value: number | null) {
	return value == null
		? "No data yet"
		: `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)}%`
}

export function formatPoints(value: number) {
	return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
}

const questionTypeLabels: Record<number, string> = {
	0: "Fill in the blank",
	1: "Single-choice",
	2: "Multiple-choice",
	3: "Question group",
}

export function formatQuestionType(value: number) {
	return questionTypeLabels[value] ?? `Question type ${value}`
}
