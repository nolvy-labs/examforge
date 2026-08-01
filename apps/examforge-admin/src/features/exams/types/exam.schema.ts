import { z } from "zod"

import { adminExamTagSummarySchema } from "@/features/exam-classifications/types/exam-classification.schema"

export const EXAM_PAGE_SIZE = 20 as const
export const EXAM_TITLE_MAX_LENGTH = 200
export const EXAM_DESCRIPTION_MAX_LENGTH = 2_000
export const EXAM_MAX_TAGS = 20
export const EXAM_SEARCH_MAX_LENGTH = 200

const uuidSchema = z.uuid()
const dateTimeSchema = z.iso.datetime({ offset: true })
const nonnegativeIntegerSchema = z.number().int().nonnegative()
const positiveIntegerSchema = z.number().int().positive()
const nonnegativeNumberSchema = z.number().finite().nonnegative()

export const examTypeSchema = z.union([z.literal(0), z.literal(1)])
export const examArchiveFilterSchema = z.enum(["active", "archived", "all"])
export const examSortOrderSchema = z.enum(["newest", "oldest"])

const examVersionStatusSchema = z.union([
	z.literal(0),
	z.literal(1),
	z.literal(2),
])

const examSectionKindSchema = z.union([
	z.literal(0),
	z.literal(1),
	z.literal(2),
	z.literal(3),
	z.literal(4),
	z.literal(5),
])

const questionTypeSchema = z.union([
	z.literal(0),
	z.literal(1),
	z.literal(2),
	z.literal(3),
])

export const paginationMetaSchema = z
	.strictObject({
		page: positiveIntegerSchema,
		pageSize: positiveIntegerSchema,
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

function collectionResponseSchema<T extends z.ZodType>(itemSchema: T) {
	return z.strictObject({
		items: z.array(itemSchema),
		meta: paginationMetaSchema,
	})
}

const questionOptionSchema = z.strictObject({
	id: uuidSchema,
	questionId: uuidSchema,
	label: z.string().nullable(),
	text: z.string(),
	isCorrect: z.boolean(),
	displayOrder: nonnegativeIntegerSchema,
	explanation: z.string().nullable(),
	createdAtUtc: dateTimeSchema,
	updatedAtUtc: dateTimeSchema.nullable(),
})

const fillAnswerKeySchema = z.strictObject({
	id: uuidSchema,
	questionId: uuidSchema,
	blankKey: z.string(),
	acceptedAnswer: z.string(),
	isCaseSensitive: z.boolean(),
	createdAtUtc: dateTimeSchema,
	updatedAtUtc: dateTimeSchema.nullable(),
})

const questionDetailSchema = z.strictObject({
	id: uuidSchema,
	examSectionId: uuidSchema,
	parentQuestionId: uuidSchema.nullable(),
	type: questionTypeSchema,
	prompt: z.string(),
	explanation: z.string().nullable(),
	points: nonnegativeNumberSchema,
	displayOrder: nonnegativeIntegerSchema,
	childQuestionCount: nonnegativeIntegerSchema,
	optionCount: nonnegativeIntegerSchema,
	answerKeyCount: nonnegativeIntegerSchema,
	isComplete: z.boolean(),
	createdAtUtc: dateTimeSchema,
	updatedAtUtc: dateTimeSchema.nullable(),
	options: z.array(questionOptionSchema),
	answerKeys: z.array(fillAnswerKeySchema),
	get childQuestions() {
		return z.array(questionDetailSchema).nullable()
	},
})

const examSectionDetailSchema = z.strictObject({
	id: uuidSchema,
	examVersionId: uuidSchema,
	kind: examSectionKindSchema,
	title: z.string(),
	displayOrder: nonnegativeIntegerSchema,
	questionCount: nonnegativeIntegerSchema,
	totalPoints: nonnegativeNumberSchema,
	createdAtUtc: dateTimeSchema,
	updatedAtUtc: dateTimeSchema.nullable(),
	instructions: z.string(),
	stimulusText: z.string().nullable(),
	mediaUrl: z.string().nullable(),
	questions: z.array(questionDetailSchema).nullable(),
})

const initialExamVersionSchema = z.strictObject({
	id: uuidSchema,
	examId: uuidSchema,
	versionNumber: positiveIntegerSchema,
	status: examVersionStatusSchema,
	title: z.string().min(1).max(EXAM_TITLE_MAX_LENGTH),
	description: z.string().max(EXAM_DESCRIPTION_MAX_LENGTH),
	instructions: z.string(),
	durationMinutes: positiveIntegerSchema.nullable(),
	totalScore: nonnegativeNumberSchema,
	contentRevision: nonnegativeIntegerSchema,
	createdByUserId: uuidSchema.nullable(),
	publishedAtUtc: dateTimeSchema.nullable(),
	retiredAtUtc: dateTimeSchema.nullable(),
	createdAtUtc: dateTimeSchema,
	updatedAtUtc: dateTimeSchema.nullable(),
	sections: z.array(examSectionDetailSchema).nullable(),
})

export const adminExamSchema = z.strictObject({
	id: uuidSchema,
	title: z.string().min(1).max(EXAM_TITLE_MAX_LENGTH),
	slug: z.string().min(1).max(220),
	description: z.string().max(EXAM_DESCRIPTION_MAX_LENGTH),
	type: examTypeSchema,
	tags: z.array(adminExamTagSummarySchema),
	isArchived: z.boolean(),
	createdAtUtc: dateTimeSchema,
	updatedAtUtc: dateTimeSchema.nullable(),
	initialVersion: initialExamVersionSchema.nullable(),
})

export const adminExamListResponseSchema = collectionResponseSchema(adminExamSchema)
export const createExamResponseSchema = adminExamSchema

const uniqueTagIdsSchema = z
	.array(uuidSchema)
	.max(EXAM_MAX_TAGS, `Select no more than ${EXAM_MAX_TAGS} tags.`)
	.refine(
		(tagIds) =>
			new Set(tagIds.map((tagId) => tagId.toLowerCase())).size ===
			tagIds.length,
		{ message: "Each tag can be selected only once." }
	)

export const createExamRequestSchema = z.strictObject({
	examDetail: z.strictObject({
		title: z.string().min(1).max(EXAM_TITLE_MAX_LENGTH),
		description: z.string().max(EXAM_DESCRIPTION_MAX_LENGTH).nullable(),
		type: examTypeSchema,
	}),
	tagIds: uniqueTagIdsSchema,
})

export const quickCreateExamFormSchema = z.strictObject({
	title: z
		.string()
		.trim()
		.min(1, "Title is required.")
		.max(
			EXAM_TITLE_MAX_LENGTH,
			`Title must be ${EXAM_TITLE_MAX_LENGTH} characters or fewer.`
		),
	description: z
		.string()
		.trim()
		.max(
			EXAM_DESCRIPTION_MAX_LENGTH,
			`Description must be ${EXAM_DESCRIPTION_MAX_LENGTH} characters or fewer.`
		)
		.optional()
		.default(""),
	type: examTypeSchema.optional().default(0),
	tagIds: uniqueTagIdsSchema.optional().default([]),
})

export const adminExamListRequestSchema = z.strictObject({
	page: positiveIntegerSchema,
	pageSize: z.literal(EXAM_PAGE_SIZE),
	search: z.string().max(EXAM_SEARCH_MAX_LENGTH).optional(),
	tagIds: z.array(uuidSchema),
	type: examTypeSchema.nullable(),
	archive: examArchiveFilterSchema,
	sort: examSortOrderSchema,
})

export function mapQuickCreateExamToRequest(
	values: z.output<typeof quickCreateExamFormSchema>
): z.output<typeof createExamRequestSchema> {
	return createExamRequestSchema.parse({
		examDetail: {
			title: values.title,
			description: values.description || null,
			type: values.type,
		},
		tagIds: values.tagIds,
	})
}
