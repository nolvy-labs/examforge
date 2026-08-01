import { z } from "zod"

import {
	apiDateTimeSchema,
	apiNonnegativeIntegerSchema,
	apiNonnegativeNumberSchema,
	apiPositiveIntegerSchema,
	apiUuidSchema,
	collectionResponseSchema,
} from "./exam-contract.schema"

export const EXAM_VERSION_TITLE_MAX_LENGTH = 200
export const EXAM_VERSION_DESCRIPTION_MAX_LENGTH = 2_000
export const EXAM_VERSION_INSTRUCTIONS_MAX_LENGTH = 10_000
export const EXAM_VERSION_MAX_DURATION_MINUTES = 1_440
export const EXAM_VERSION_MAX_PAGE_SIZE = 100
export const EXAM_SECTION_TITLE_MAX_LENGTH = 200
export const EXAM_SECTION_INSTRUCTIONS_MAX_LENGTH = 10_000
export const EXAM_SECTION_STIMULUS_MAX_LENGTH = 50_000
export const EXAM_SECTION_MEDIA_URL_MAX_LENGTH = 1_024
export const QUESTION_PROMPT_MAX_LENGTH = 20_000
export const QUESTION_EXPLANATION_MAX_LENGTH = 20_000
export const QUESTION_MIN_POINTS = 0.01
export const QUESTION_MAX_POINTS = 999_999.99
export const QUESTION_POINTS_SCALE = 2
export const OPTION_LABEL_MAX_LENGTH = 50
export const OPTION_TEXT_MAX_LENGTH = 10_000
export const OPTION_EXPLANATION_MAX_LENGTH = 10_000
export const ACCEPTED_ANSWER_MAX_LENGTH = 2_000
export const DEFAULT_BLANK_KEY = "answer"
export const MAX_SECTIONS_PER_VERSION = 100
export const MAX_QUESTIONS_PER_SECTION = 500
export const MAX_QUESTIONS_PER_NESTED_REQUEST = 2_000
export const MAX_CHILDREN_PER_GROUP = 200
export const MAX_OPTIONS_PER_QUESTION = 20
export const MAX_ANSWERS_PER_QUESTION = 20
export const MAX_PATCH_OPERATIONS_PER_TARGET = 20
export const MAX_PATCH_PATH_LENGTH = 128
export const MAX_BATCH_TARGETS = 1_000
export const MAX_BATCH_OPERATIONS = 5_000

export const examVersionStatusSchema = z.union([
	z.literal(0),
	z.literal(1),
	z.literal(2),
])

export const examSectionKindSchema = z.union([
	z.literal(0),
	z.literal(1),
	z.literal(2),
	z.literal(3),
	z.literal(4),
	z.literal(5),
])

export const questionTypeSchema = z.union([
	z.literal(0),
	z.literal(1),
	z.literal(2),
	z.literal(3),
])

export const questionOptionResponseSchema = z.strictObject({
	id: apiUuidSchema,
	questionId: apiUuidSchema,
	label: z.string().nullable(),
	text: z.string(),
	isCorrect: z.boolean(),
	displayOrder: apiNonnegativeIntegerSchema,
	explanation: z.string().nullable(),
	createdAtUtc: apiDateTimeSchema,
	updatedAtUtc: apiDateTimeSchema.nullable(),
})

export const fillAnswerKeyResponseSchema = z.strictObject({
	id: apiUuidSchema,
	questionId: apiUuidSchema,
	blankKey: z.string(),
	acceptedAnswer: z.string(),
	isCaseSensitive: z.boolean(),
	createdAtUtc: apiDateTimeSchema,
	updatedAtUtc: apiDateTimeSchema.nullable(),
})

export const questionDetailResponseSchema = z.strictObject({
	id: apiUuidSchema,
	examSectionId: apiUuidSchema,
	parentQuestionId: apiUuidSchema.nullable(),
	type: questionTypeSchema,
	prompt: z.string(),
	explanation: z.string().nullable(),
	points: apiNonnegativeNumberSchema,
	displayOrder: apiNonnegativeIntegerSchema,
	childQuestionCount: apiNonnegativeIntegerSchema,
	optionCount: apiNonnegativeIntegerSchema,
	answerKeyCount: apiNonnegativeIntegerSchema,
	isComplete: z.boolean(),
	createdAtUtc: apiDateTimeSchema,
	updatedAtUtc: apiDateTimeSchema.nullable(),
	options: z.array(questionOptionResponseSchema),
	answerKeys: z.array(fillAnswerKeyResponseSchema),
	get childQuestions() {
		return z.array(questionDetailResponseSchema).nullable()
	},
})

export const examSectionDetailResponseSchema = z.strictObject({
	id: apiUuidSchema,
	examVersionId: apiUuidSchema,
	kind: examSectionKindSchema,
	title: z.string(),
	displayOrder: apiNonnegativeIntegerSchema,
	questionCount: apiNonnegativeIntegerSchema,
	totalPoints: apiNonnegativeNumberSchema,
	createdAtUtc: apiDateTimeSchema,
	updatedAtUtc: apiDateTimeSchema.nullable(),
	instructions: z.string(),
	stimulusText: z.string().nullable(),
	mediaUrl: z.string().nullable(),
	questions: z.array(questionDetailResponseSchema).nullable(),
})

export const examSectionSummaryResponseSchema = examSectionDetailResponseSchema.pick({
	id: true,
	examVersionId: true,
	kind: true,
	title: true,
	displayOrder: true,
	questionCount: true,
	totalPoints: true,
	createdAtUtc: true,
	updatedAtUtc: true,
})

export const questionSummaryResponseSchema = questionDetailResponseSchema.pick({
	id: true,
	examSectionId: true,
	parentQuestionId: true,
	type: true,
	prompt: true,
	points: true,
	displayOrder: true,
	childQuestionCount: true,
	optionCount: true,
	answerKeyCount: true,
	isComplete: true,
	createdAtUtc: true,
	updatedAtUtc: true,
})

export const examSectionSummaryListResponseSchema = z.array(
	examSectionSummaryResponseSchema
)
export const questionSummaryListResponseSchema = z.array(
	questionSummaryResponseSchema
)
export const questionOptionListResponseSchema = z.array(
	questionOptionResponseSchema
)
export const fillAnswerKeyListResponseSchema = z.array(
	fillAnswerKeyResponseSchema
)

const fullExamSectionDetailResponseSchema = examSectionDetailResponseSchema.extend({
	questions: z.array(questionDetailResponseSchema),
})

const versionResponseFields = {
	id: apiUuidSchema,
	examId: apiUuidSchema,
	versionNumber: apiPositiveIntegerSchema,
	status: examVersionStatusSchema,
	title: z.string(),
	description: z.string(),
	instructions: z.string(),
	durationMinutes: apiPositiveIntegerSchema.nullable(),
	totalScore: apiNonnegativeNumberSchema,
	contentRevision: apiPositiveIntegerSchema,
	createdByUserId: apiUuidSchema.nullable(),
	publishedAtUtc: apiDateTimeSchema.nullable(),
	retiredAtUtc: apiDateTimeSchema.nullable(),
	createdAtUtc: apiDateTimeSchema,
	updatedAtUtc: apiDateTimeSchema.nullable(),
}

export const examVersionSummaryResponseSchema = z.strictObject({
	id: versionResponseFields.id,
	examId: versionResponseFields.examId,
	versionNumber: versionResponseFields.versionNumber,
	status: versionResponseFields.status,
	title: versionResponseFields.title,
	durationMinutes: versionResponseFields.durationMinutes,
	totalScore: versionResponseFields.totalScore,
	contentRevision: versionResponseFields.contentRevision,
	createdByUserId: versionResponseFields.createdByUserId,
	publishedAtUtc: versionResponseFields.publishedAtUtc,
	retiredAtUtc: versionResponseFields.retiredAtUtc,
	createdAtUtc: versionResponseFields.createdAtUtc,
	updatedAtUtc: versionResponseFields.updatedAtUtc,
})

export const examVersionDetailResponseSchema = z.strictObject({
	...versionResponseFields,
	sections: z.array(examSectionDetailResponseSchema).nullable(),
})

// The DTO allows null, but a builder bootstrap requires the complete graph.
export const fullExamVersionResponseSchema = examVersionDetailResponseSchema.extend({
	sections: z.array(fullExamSectionDetailResponseSchema),
})

export const getExamVersionsRequestSchema = z.strictObject({
	page: apiPositiveIntegerSchema,
	pageSize: apiPositiveIntegerSchema.max(EXAM_VERSION_MAX_PAGE_SIZE),
	status: examVersionStatusSchema.nullable().optional(),
	sort: z.enum(["newest", "oldest"]),
})

export const examVersionListResponseSchema = collectionResponseSchema(
	examVersionSummaryResponseSchema
)

export const createQuestionOptionDetailSchema = z.strictObject({
	text: z.string(),
	label: z.string().nullable().optional(),
	isCorrect: z.boolean().optional(),
	explanation: z.string().nullable().optional(),
})

export const createFillAnswerKeyInputSchema = z.strictObject({
	acceptedAnswer: z.string(),
	isCaseSensitive: z.boolean().optional(),
})

export const createQuestionDetailSchema = z.strictObject({
	type: questionTypeSchema,
	prompt: z.string(),
	explanation: z.string().nullable().optional(),
	points: z.number().finite().nullable().optional(),
})

export const createChildQuestionInputSchema = z.strictObject({
	detail: createQuestionDetailSchema,
	options: z.array(createQuestionOptionDetailSchema).nullable().optional(),
	answerKeys: z.array(createFillAnswerKeyInputSchema).nullable().optional(),
})

export const createQuestionInputSchema = z.strictObject({
	detail: createQuestionDetailSchema,
	childQuestions: z.array(createChildQuestionInputSchema).nullable().optional(),
	options: z.array(createQuestionOptionDetailSchema).nullable().optional(),
	answerKeys: z.array(createFillAnswerKeyInputSchema).nullable().optional(),
})

export const createQuestionRequestSchema = createQuestionInputSchema.extend({
	parentQuestionId: apiUuidSchema.nullable().optional(),
})

export const createExamSectionDetailSchema = z.strictObject({
	title: z.string(),
	kind: examSectionKindSchema.optional(),
	instructions: z.string().nullable().optional(),
	stimulusText: z.string().nullable().optional(),
	mediaUrl: z.string().nullable().optional(),
})

export const createExamSectionInputSchema = z.strictObject({
	detail: createExamSectionDetailSchema,
	questions: z.array(createQuestionInputSchema).nullable().optional(),
})

export const createExamSectionRequestSchema = createExamSectionInputSchema

export const createExamVersionDetailSchema = z.strictObject({
	title: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	instructions: z.string().nullable().optional(),
	durationMinutes: z.number().int().nullable().optional(),
})

export const createExamVersionRequestSchema = z.strictObject({
	sourceVersionId: apiUuidSchema.nullable().optional(),
	detail: createExamVersionDetailSchema.nullable().optional(),
	sections: z.array(createExamSectionInputSchema).nullable().optional(),
})

export const createInitialExamVersionInputSchema = z.strictObject({
	detail: createExamVersionDetailSchema.nullable().optional(),
	sections: z.array(createExamSectionInputSchema).nullable().optional(),
	sourceVersionId: apiUuidSchema.nullable().optional(),
})

export const createQuestionOptionRequestSchema = z.strictObject({
	detail: createQuestionOptionDetailSchema,
})

export const createFillAnswerKeyRequestSchema = createFillAnswerKeyInputSchema

export const reorderExamSectionsRequestSchema = z.strictObject({
	orderedSectionIds: z.array(apiUuidSchema),
})

export const reorderQuestionsRequestSchema = z.strictObject({
	parentQuestionId: apiUuidSchema.nullable(),
	orderedQuestionIds: z.array(apiUuidSchema),
})

export const reorderQuestionOptionsRequestSchema = z.strictObject({
	orderedOptionIds: z.array(apiUuidSchema),
})

export const patchOperationSchema = z.strictObject({
	op: z.enum(["replace", "remove"]),
	path: z.string().min(1).max(MAX_PATCH_PATH_LENGTH),
	value: z.unknown().optional(),
	from: z.null().optional(),
})

const patchTargetOperationsSchema = z
	.array(patchOperationSchema)
	.max(MAX_PATCH_OPERATIONS_PER_TARGET)

export const sectionPatchTargetSchema = z.strictObject({
	sectionId: apiUuidSchema,
	operations: patchTargetOperationsSchema.nullable(),
})

export const questionPatchTargetSchema = z.strictObject({
	questionId: apiUuidSchema,
	operations: patchTargetOperationsSchema.nullable(),
})

export const questionOptionPatchTargetSchema = z.strictObject({
	optionId: apiUuidSchema,
	operations: patchTargetOperationsSchema.nullable(),
})

export const fillAnswerKeyPatchTargetSchema = z.strictObject({
	answerKeyId: apiUuidSchema,
	operations: patchTargetOperationsSchema.nullable(),
})

export const bulkUpdateExamVersionContentRequestSchema = z.strictObject({
	versionPatch: patchTargetOperationsSchema.nullable().optional(),
	sectionPatches: z.array(sectionPatchTargetSchema.nullable()).nullable().optional(),
	questionPatches: z.array(questionPatchTargetSchema.nullable()).nullable().optional(),
	optionPatches: z.array(questionOptionPatchTargetSchema.nullable()).nullable().optional(),
	answerKeyPatches: z
		.array(fillAnswerKeyPatchTargetSchema.nullable())
		.nullable()
		.optional(),
})

export const bulkUpdateExamVersionContentResponseSchema = z.strictObject({
	contentRevision: apiPositiveIntegerSchema,
	version: examVersionDetailResponseSchema,
	updatedSections: z.array(examSectionDetailResponseSchema),
	updatedQuestions: z.array(questionDetailResponseSchema),
	updatedOptions: z.array(questionOptionResponseSchema),
	updatedAnswerKeys: z.array(fillAnswerKeyResponseSchema),
})

export const contentRevisionEtagSchema = z
	.string()
	.regex(/^"[1-9]\d*"$/, "Expected a quoted positive content revision.")

export const concurrencyMetadataSchema = z.strictObject({
	contentRevision: apiPositiveIntegerSchema,
	etag: contentRevisionEtagSchema,
})

export const patchValidationErrorSchema = z.strictObject({
	operationIndex: apiNonnegativeIntegerSchema,
	path: z.string().nullable(),
	code: z.string().min(1),
	message: z.string(),
})

export const contentValidationErrorSchema = z.strictObject({
	path: z.string(),
	code: z.string().min(1),
	message: z.string(),
})

export const examBuilderProblemDetailsSchema = z.object({
	type: z.string().optional(),
	title: z.string().optional(),
	status: z.number().int().optional(),
	detail: z.string().optional(),
	instance: z.string().optional(),
	errors: z
		.union([
			z.record(z.string(), z.array(z.string())),
			z.array(patchValidationErrorSchema),
			z.array(contentValidationErrorSchema),
		])
		.optional(),
})
