export type AttemptStatus = "in-progress" | "submitted" | "abandoned"
export type QuestionType =
	| "fill-blank"
	| "multiple-choice-single"
	| "multiple-choice-multiple"
	| "group"
export type GradingStatus =
	| "unanswered"
	| "incorrect"
	| "partially-correct"
	| "correct"

export interface AttemptAnswer {
	textAnswer: string | null
	selectedOptionIds: string[]
	awardedScore?: number | null
	maximumScore?: number | null
	gradingStatus?: string | number | null
}

export interface AttemptOption {
	id: string
	label: string | null
	text: string
	displayOrder: number
}

export interface AttemptSolution {
	explanation: string | null
	options: Array<{ optionId: string; isCorrect: boolean; explanation: string | null }>
	acceptedAnswers: Array<{
		blankKey: string
		acceptedAnswer: string
		isCaseSensitive: boolean
		displayOrder: number
	}>
}

export interface AttemptQuestion {
	id: string
	parentQuestionId: string | null
	type: string | number
	prompt: string
	points: number
	displayOrder: number
	metadata: unknown
	options: AttemptOption[]
	childQuestions: AttemptQuestion[]
	answer?: AttemptAnswer | null
	solution?: AttemptSolution | null
}

export interface AttemptSection {
	id: string
	kind: string | number
	title: string
	instructions: string
	stimulusText: string | null
	mediaUrl: string | null
	displayOrder: number
	metadata: unknown
	questions: AttemptQuestion[]
}

export interface AttemptDetail {
	attemptId: string
	examId: string
	examVersionId: string
	status: string | number
	revision: number
	startedAtUtc: string
	expiresAtUtc: string | null
	remainingTimeSeconds?: number | null
	submittedAtUtc?: string | null
	abandonedAtUtc?: string | null
	score?: number | null
	maximumScore?: number | null
	percentage?: number | null
	exam: { title: string; slug: string; description: string; type: string | number }
	examVersion: {
		versionNumber: number
		title: string
		description: string
		instructions: string
		durationMinutes: number | null
	}
	sections: AttemptSection[]
}

export interface AttemptResponse {
	data: AttemptDetail
	etag: string
}

export interface DraftAnswer {
	textAnswer: string | null
	selectedOptionIds: string[]
}

export interface AttemptPatchOperation {
	op: "replace"
	path: string
	value: string | null | string[]
}

export function getAttemptStatus(value: string | number): AttemptStatus {
	if (value === 0 || String(value).toLowerCase().replaceAll("_", "") === "inprogress") {
		return "in-progress"
	}
	if (value === 1 || String(value).toLowerCase() === "submitted") return "submitted"
	return "abandoned"
}

export function getQuestionType(value: string | number): QuestionType {
	if (value === 0 || String(value).toLowerCase() === "fillblank") return "fill-blank"
	if (value === 1 || String(value).toLowerCase() === "multiplechoicesingle") {
		return "multiple-choice-single"
	}
	if (value === 2 || String(value).toLowerCase() === "multiplechoicemultiple") {
		return "multiple-choice-multiple"
	}
	return "group"
}

export function getGradingStatus(value?: string | number | null): GradingStatus | null {
	if (value == null) return null
	const normalized = String(value).toLowerCase()
	if (value === 0 || normalized === "unanswered") return "unanswered"
	if (value === 1 || normalized === "incorrect") return "incorrect"
	if (value === 2 || normalized === "partiallycorrect") return "partially-correct"
	return "correct"
}

export function answerFromQuestion(question: AttemptQuestion): DraftAnswer {
	return {
		textAnswer: question.answer?.textAnswer ?? null,
		selectedOptionIds: [...(question.answer?.selectedOptionIds ?? [])],
	}
}

export function flattenAnswerableQuestions(sections: AttemptSection[]) {
	return sections.flatMap((section) =>
		section.questions.flatMap((question) =>
			getQuestionType(question.type) === "group" ? question.childQuestions : [question]
		)
	)
}
