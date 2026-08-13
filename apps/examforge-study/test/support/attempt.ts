import type {
	AttemptDetail,
	AttemptOption,
	AttemptQuestion,
	AttemptResponse,
	AttemptSection,
	StudentExamAttempt,
} from "@/features/attempt/types/attempt.type"
import type { AttemptLocalDraft } from "@/features/attempt/attempt-workspace/persistence/attempt-draft.storage"

export const ATTEMPT_IDS = {
	attempt: "10000000-0000-4000-8000-000000000001",
	exam: "10000000-0000-4000-8000-000000000002",
	version: "10000000-0000-4000-8000-000000000003",
	student: "10000000-0000-4000-8000-000000000004",
	section: "10000000-0000-4000-8000-000000000005",
	fill: "10000000-0000-4000-8000-000000000006",
	single: "10000000-0000-4000-8000-000000000007",
	multi: "10000000-0000-4000-8000-000000000008",
	group: "10000000-0000-4000-8000-000000000009",
	groupChild: "10000000-0000-4000-8000-000000000010",
	optionA: "10000000-0000-4000-8000-000000000011",
	optionB: "10000000-0000-4000-8000-000000000012",
} as const

export const STARTED_AT = "2026-08-13T01:00:00.000Z"
export const UPDATED_AT = "2026-08-13T01:05:00.000Z"

export function buildAttemptOption(overrides: Partial<AttemptOption> = {}): AttemptOption {
	return {
		id: ATTEMPT_IDS.optionA,
		label: "A",
		text: "Option A",
		displayOrder: 0,
		...overrides,
	}
}

export function buildFillBlankQuestion(overrides: Partial<AttemptQuestion> = {}): AttemptQuestion {
	return {
		id: ATTEMPT_IDS.fill,
		parentQuestionId: null,
		type: "fill-blank",
		prompt: "Fill the blank",
		points: 1,
		displayOrder: 0,
		metadata: null,
		options: [],
		childQuestions: [],
		answer: { textAnswer: "server text", selectedOptionIds: [] },
		...overrides,
	}
}

export function buildSingleSelectQuestion(overrides: Partial<AttemptQuestion> = {}): AttemptQuestion {
	return {
		id: ATTEMPT_IDS.single,
		parentQuestionId: null,
		type: "multiple-choice-single",
		prompt: "Choose one",
		points: 2,
		displayOrder: 1,
		metadata: null,
		options: [
			buildAttemptOption(),
			buildAttemptOption({ id: ATTEMPT_IDS.optionB, label: "B", text: "Option B", displayOrder: 1 }),
		],
		childQuestions: [],
		answer: { textAnswer: null, selectedOptionIds: [ATTEMPT_IDS.optionA] },
		...overrides,
	}
}

export function buildMultiSelectQuestion(overrides: Partial<AttemptQuestion> = {}): AttemptQuestion {
	return buildSingleSelectQuestion({
		id: ATTEMPT_IDS.multi,
		type: "multiple-choice-multiple",
		prompt: "Choose many",
		displayOrder: 2,
		...overrides,
	})
}

export function buildGroupQuestion(overrides: Partial<AttemptQuestion> = {}): AttemptQuestion {
	const child = buildFillBlankQuestion({
		id: ATTEMPT_IDS.groupChild,
		parentQuestionId: ATTEMPT_IDS.group,
		prompt: "Grouped blank",
	})
	return {
		id: ATTEMPT_IDS.group,
		parentQuestionId: null,
		type: "group",
		prompt: "Question group",
		points: 1,
		displayOrder: 3,
		metadata: null,
		options: [],
		childQuestions: [child],
		answer: null,
		...overrides,
	}
}

export function buildAttemptSection(overrides: Partial<AttemptSection> = {}): AttemptSection {
	return {
		id: ATTEMPT_IDS.section,
		kind: "default",
		title: "Section One",
		instructions: "Answer every question.",
		stimulusText: null,
		mediaUrl: null,
		displayOrder: 0,
		metadata: null,
		questions: [
			buildFillBlankQuestion(),
			buildSingleSelectQuestion(),
			buildMultiSelectQuestion(),
			buildGroupQuestion(),
		],
		...overrides,
	}
}

export function buildAttemptDetail(overrides: Partial<AttemptDetail> = {}): AttemptDetail {
	return {
		attemptId: ATTEMPT_IDS.attempt,
		examId: ATTEMPT_IDS.exam,
		examVersionId: ATTEMPT_IDS.version,
		status: "in-progress",
		mode: "practice",
		revision: 3,
		startedAtUtc: STARTED_AT,
		expiresAtUtc: null,
		remainingTimeSeconds: null,
		submittedAtUtc: null,
		abandonedAtUtc: null,
		score: null,
		maximumScore: 6,
		percentage: null,
		exam: {
			title: "Biology Foundations",
			slug: "biology-foundations",
			description: "A deterministic test exam.",
			type: "simple",
		},
		examVersion: {
			versionNumber: 1,
			title: "Biology Foundations v1",
			description: "Version description",
			instructions: "Read carefully.",
			durationMinutes: null,
		},
		sections: [buildAttemptSection()],
		...overrides,
	}
}

export function buildAttemptResponse(overrides: Partial<AttemptResponse> = {}): AttemptResponse {
	return {
		data: buildAttemptDetail(),
		etag: '"3"',
		...overrides,
	}
}

export function buildStudentAttempt(overrides: Partial<StudentExamAttempt> = {}): StudentExamAttempt {
	return {
		attemptId: ATTEMPT_IDS.attempt,
		examId: ATTEMPT_IDS.exam,
		examVersionId: ATTEMPT_IDS.version,
		examTitle: "Biology Foundations",
		examSlug: "biology-foundations",
		status: "in-progress",
		mode: "practice",
		startedAtUtc: STARTED_AT,
		expiresAtUtc: null,
		submittedAtUtc: null,
		abandonedAtUtc: null,
		score: null,
		maximumScore: null,
		percentage: null,
		revision: 3,
		createdAtUtc: STARTED_AT,
		updatedAtUtc: UPDATED_AT,
		...overrides,
	}
}

export function buildLocalAttemptDraft(overrides: Partial<AttemptLocalDraft> = {}): AttemptLocalDraft {
	return {
		schemaVersion: 1,
		attemptId: ATTEMPT_IDS.attempt,
		examVersionId: ATTEMPT_IDS.version,
		studentId: ATTEMPT_IDS.student,
		mode: "practice",
		serverRevision: 3,
		answers: {
			[ATTEMPT_IDS.fill]: { textAnswer: "local text", selectedOptionIds: [] },
		},
		dirtyAnswers: { [ATTEMPT_IDS.fill]: 1 },
		practiceElapsedMs: 12_000,
		updatedAtUtc: UPDATED_AT,
		...overrides,
	}
}

export function toRawAttemptDetail(detail = buildAttemptDetail()) {
	const status = { "in-progress": 0, submitted: 1, abandoned: 2 } as const
	const examType = { simple: 0, ielts: 1 } as const
	const sectionKind = { default: 0, reading: 1, listening: 2, writing: 3, speaking: 4, custom: 5 } as const
	const questionType = { "fill-blank": 0, "multiple-choice-single": 1, "multiple-choice-multiple": 2, group: 3 } as const
	const grading = { unanswered: 0, incorrect: 1, "partially-correct": 2, correct: 3 } as const
	const rawQuestion = (question: AttemptQuestion): unknown => ({
		...question,
		type: questionType[question.type],
		answer: question.answer ? {
			...question.answer,
			gradingStatus: question.answer.gradingStatus == null ? question.answer.gradingStatus : grading[question.answer.gradingStatus],
		} : question.answer,
		childQuestions: question.childQuestions.map(rawQuestion),
	})
	return {
		...detail,
		status: status[detail.status],
		exam: { ...detail.exam, type: examType[detail.exam.type] },
		sections: detail.sections.map((section) => ({
			...section,
			kind: sectionKind[section.kind],
			questions: section.questions.map(rawQuestion),
		})),
	}
}

export function toRawStudentAttempt(attempt = buildStudentAttempt()) {
	const status = { "in-progress": 0, submitted: 1, abandoned: 2 } as const
	return { ...attempt, status: status[attempt.status] }
}
