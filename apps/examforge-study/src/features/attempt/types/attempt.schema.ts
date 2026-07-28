import { z } from "zod"

import type { AttemptQuestion } from "./attempt.type"

const uuidSchema = z.uuid()
const dateTimeSchema = z.iso.datetime({ offset: true })
const nonnegativeIntegerSchema = z.number().int().nonnegative()
const nonnegativeNumberSchema = z.number().finite().nonnegative()

export const attemptStatusSchema = z
	.union([z.literal(0), z.literal(1), z.literal(2)])
	.transform(
		(value) =>
			(["in-progress", "submitted", "abandoned"] as const)[value]
	)

const examTypeSchema = z
	.union([z.literal(0), z.literal(1)])
	.transform((value) => (value === 0 ? ("simple" as const) : ("ielts" as const)))

const examSectionKindSchema = z
	.union([
		z.literal(0),
		z.literal(1),
		z.literal(2),
		z.literal(3),
		z.literal(4),
		z.literal(5),
	])
	.transform(
		(value) =>
			(
				[
					"default",
					"reading",
					"listening",
					"writing",
					"speaking",
					"custom",
				] as const
			)[value]
	)

const questionTypeSchema = z
	.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
	.transform((value) => (
		[
			"fill-blank",
			"multiple-choice-single",
			"multiple-choice-multiple",
			"group",
		] as const
	)[value])

const gradingStatusSchema = z
	.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
	.transform((value) => (
		["unanswered", "incorrect", "partially-correct", "correct"] as const
	)[value])

const attemptAnswerSchema = z.object({
	textAnswer: z.string().nullable(),
	selectedOptionIds: z.array(uuidSchema),
	awardedScore: nonnegativeNumberSchema.nullable().optional(),
	maximumScore: nonnegativeNumberSchema.nullable().optional(),
	gradingStatus: gradingStatusSchema.nullable().optional(),
})

const attemptSolutionSchema = z.object({
	explanation: z.string().nullable(),
	options: z.array(z.object({
		optionId: uuidSchema,
		isCorrect: z.boolean(),
		explanation: z.string().nullable(),
	})),
	acceptedAnswers: z.array(z.object({
		blankKey: z.string(),
		acceptedAnswer: z.string(),
		isCaseSensitive: z.boolean(),
		displayOrder: nonnegativeIntegerSchema,
	})),
})

const attemptQuestionSchema: z.ZodType<AttemptQuestion> = z.lazy(() =>
	z.object({
		id: uuidSchema,
		parentQuestionId: uuidSchema.nullable(),
		type: questionTypeSchema,
		prompt: z.string(),
		points: nonnegativeNumberSchema,
		displayOrder: nonnegativeIntegerSchema,
		metadata: z.json().nullable(),
		options: z.array(z.object({
			id: uuidSchema,
			label: z.string().nullable(),
			text: z.string(),
			displayOrder: nonnegativeIntegerSchema,
		})),
		childQuestions: z.array(attemptQuestionSchema),
		answer: attemptAnswerSchema.nullable().optional(),
		solution: attemptSolutionSchema.nullable().optional(),
	})
)

export const attemptDetailSchema = z.object({
	attemptId: uuidSchema,
	examId: uuidSchema,
	examVersionId: uuidSchema,
	status: attemptStatusSchema,
	revision: nonnegativeIntegerSchema,
	startedAtUtc: dateTimeSchema,
	expiresAtUtc: dateTimeSchema.nullable(),
	remainingTimeSeconds: nonnegativeIntegerSchema.nullable().optional(),
	submittedAtUtc: dateTimeSchema.nullable().optional(),
	abandonedAtUtc: dateTimeSchema.nullable().optional(),
	score: nonnegativeNumberSchema.nullable().optional(),
	maximumScore: nonnegativeNumberSchema.nullable().optional(),
	percentage: nonnegativeNumberSchema.nullable().optional(),
	exam: z.object({
		title: z.string(),
		slug: z.string(),
		description: z.string(),
		type: examTypeSchema,
	}),
	examVersion: z.object({
		versionNumber: z.number().int().positive(),
		title: z.string(),
		description: z.string(),
		instructions: z.string(),
		durationMinutes: z.number().int().positive().nullable(),
	}),
	sections: z.array(z.object({
		id: uuidSchema,
		kind: examSectionKindSchema,
		title: z.string(),
		instructions: z.string(),
		stimulusText: z.string().nullable(),
		mediaUrl: z.string().nullable(),
		displayOrder: nonnegativeIntegerSchema,
		metadata: z.json().nullable(),
		questions: z.array(attemptQuestionSchema),
	})),
})

const paginationSchema = z
	.object({
		page: z.number().int().positive(),
		pageSize: z.number().int().positive(),
		totalItems: nonnegativeIntegerSchema,
		totalPages: nonnegativeIntegerSchema,
		hasPreviousPage: z.boolean(),
		hasNextPage: z.boolean(),
	})
	.superRefine((meta, context) => {
		const expectedPages =
			meta.totalItems === 0 ? 0 : Math.ceil(meta.totalItems / meta.pageSize)
		if (meta.totalPages !== expectedPages) {
			context.addIssue({
				code: "custom",
				message: "totalPages is inconsistent with totalItems and pageSize",
				path: ["totalPages"],
			})
		}
		if (meta.hasPreviousPage !== (meta.page > 1)) {
			context.addIssue({
				code: "custom",
				message: "hasPreviousPage is inconsistent with page",
				path: ["hasPreviousPage"],
			})
		}
		if (meta.hasNextPage !== (meta.page < meta.totalPages)) {
			context.addIssue({
				code: "custom",
				message: "hasNextPage is inconsistent with page and totalPages",
				path: ["hasNextPage"],
			})
		}
	})

const nullableOptionalScoreSchema = nonnegativeNumberSchema.nullable().optional()

export const studentExamAttemptPageSchema = z.object({
	items: z.array(
		z.object({
			attemptId: uuidSchema,
			examId: uuidSchema,
			examVersionId: uuidSchema,
			examTitle: z.string(),
			examSlug: z.string(),
			status: attemptStatusSchema,
			startedAtUtc: dateTimeSchema,
			expiresAtUtc: dateTimeSchema.nullable(),
			submittedAtUtc: dateTimeSchema.nullable(),
			abandonedAtUtc: dateTimeSchema.nullable(),
			score: nullableOptionalScoreSchema,
			maximumScore: nullableOptionalScoreSchema,
			percentage: nullableOptionalScoreSchema,
			revision: nonnegativeIntegerSchema,
			updatedAtUtc: dateTimeSchema,
		})
	),
	meta: paginationSchema,
})

export const createdExamAttemptSchema = z.object({
	attemptId: uuidSchema,
	revision: nonnegativeIntegerSchema,
})
