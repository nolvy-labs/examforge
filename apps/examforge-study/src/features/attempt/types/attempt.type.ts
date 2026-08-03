export type AttemptStatus = "in-progress" | "submitted" | "abandoned"
export type AttemptSort = "created-at-desc" | "created-at-asc"

export interface GetAttemptsParams {
	status?: AttemptStatus
	examId?: string
	sort?: AttemptSort
	page?: number
	pageSize?: number
}
export type AttemptExamType = "simple" | "ielts"
export type AttemptSectionKind =
	| "default"
	| "reading"
	| "listening"
	| "writing"
	| "speaking"
	| "custom"
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
	gradingStatus?: GradingStatus | null
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
	type: QuestionType
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
	kind: AttemptSectionKind
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
	status: AttemptStatus
	revision: number
	startedAtUtc: string
	expiresAtUtc: string | null
	remainingTimeSeconds?: number | null
	submittedAtUtc?: string | null
	abandonedAtUtc?: string | null
	score?: number | null
	maximumScore?: number | null
	percentage?: number | null
	exam: {
		title: string
		slug: string
		description: string
		type: AttemptExamType
	}
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

export interface StudentExamAttempt {
	attemptId: string
	examId: string
	examVersionId: string
	examTitle: string
	examSlug: string
	status: AttemptStatus
	startedAtUtc: string
	expiresAtUtc: string | null
	submittedAtUtc: string | null
	abandonedAtUtc: string | null
	score?: number | null
	maximumScore?: number | null
	percentage?: number | null
	revision: number
	createdAtUtc: string
	updatedAtUtc: string
}

export interface StudentExamAttemptPage {
	items: StudentExamAttempt[]
	meta: {
		page: number
		pageSize: number
		totalItems: number
		totalPages: number
		hasPreviousPage: boolean
		hasNextPage: boolean
	}
}

export function getAttemptStatus(value: AttemptStatus) {
	return value
}

export function getQuestionType(value: QuestionType) {
	return value
}

export function getGradingStatus(value?: GradingStatus | null) {
	return value ?? null
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
