import { z } from "zod"

import {
	attemptStatusSchema,
	examSectionKindSchema,
	examTypeSchema,
} from "@/features/exams/model/exam.schema"

import type { AttemptQuestion } from "./attempt.type"

const uuidSchema = z.uuid()
const dateTimeSchema = z.iso.datetime({ offset: true })
const nonnegativeIntegerSchema = z.number().int().nonnegative()
const nonnegativeNumberSchema = z.number().finite().nonnegative()

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
