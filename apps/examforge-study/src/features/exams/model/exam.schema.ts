import { z } from "zod"

const uuidSchema = z.uuid()
const dateTimeSchema = z.iso.datetime({ offset: true })
const nonnegativeIntegerSchema = z.number().int().nonnegative()
const positiveIntegerSchema = z.number().int().positive()
const nonnegativeNumberSchema = z.number().finite().nonnegative()

export const examTypeSchema = z
	.union([z.literal(0), z.literal(1)])
	.transform((value) => value === 0 ? "simple" as const : "ielts" as const)

export const examTagTypeSchema = z
	.union([
		z.literal(0),
		z.literal(1),
		z.literal(2),
		z.literal(3),
		z.literal(4),
		z.literal(5),
		z.literal(6),
		z.literal(7),
	])
	.transform((value) => (
		[
			"unknown",
			"subject",
			"exam-type",
			"year",
			"grade",
			"skill",
			"level",
			"topic",
		] as const
	)[value])

export const examSectionKindSchema = z
	.union([
		z.literal(0),
		z.literal(1),
		z.literal(2),
		z.literal(3),
		z.literal(4),
		z.literal(5),
	])
	.transform((value) => (
		[
			"default",
			"reading",
			"listening",
			"writing",
			"speaking",
			"custom",
		] as const
	)[value])

export const attemptStatusSchema = z
	.union([z.literal(0), z.literal(1), z.literal(2)])
	.transform((value) => (
		["in-progress", "submitted", "abandoned"] as const
	)[value])

export const studentExamTagSchema = z.object({
	id: uuidSchema,
	name: z.string(),
	slug: z.string(),
	type: examTagTypeSchema,
})

const paginationSchema = z.object({
	page: positiveIntegerSchema,
	pageSize: positiveIntegerSchema,
	totalItems: nonnegativeIntegerSchema,
	totalPages: nonnegativeIntegerSchema,
	hasPreviousPage: z.boolean(),
	hasNextPage: z.boolean(),
}).superRefine((meta, context) => {
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

const publishedVersionSummarySchema = z.object({
	id: uuidSchema,
	versionNumber: positiveIntegerSchema,
	title: z.string(),
	durationMinutes: positiveIntegerSchema.nullable(),
	totalScore: nonnegativeNumberSchema,
	sectionCount: nonnegativeIntegerSchema,
	questionCount: nonnegativeIntegerSchema,
	publishedAtUtc: dateTimeSchema,
})

const studentExamListItemSchema = z.object({
	id: uuidSchema,
	title: z.string(),
	slug: z.string(),
	description: z.string(),
	type: examTypeSchema,
	tags: z.array(studentExamTagSchema),
	publishedVersion: publishedVersionSummarySchema,
	createdAtUtc: dateTimeSchema,
	updatedAtUtc: dateTimeSchema.nullable(),
})

export const studentExamPageSchema = z.object({
	items: z.array(studentExamListItemSchema),
	meta: paginationSchema,
})

const studentExamFilterItemSchema = z.object({
	id: uuidSchema,
	name: z.string(),
	slug: z.string(),
	examCount: nonnegativeIntegerSchema,
})

export const studentExamFiltersSchema = z.object({
	groups: z.array(z.object({
		type: examTagTypeSchema,
		items: z.array(studentExamFilterItemSchema),
	})),
})

export const studentExamCategoriesSchema = z.array(z.object({
	id: uuidSchema,
	name: z.string(),
	slug: z.string(),
	description: z.string(),
	isFeatured: z.boolean(),
	examCount: nonnegativeIntegerSchema,
	tags: z.array(studentExamTagSchema),
}))

export const studentExamDetailSchema = z.object({
	exam: z.object({
		id: uuidSchema,
		title: z.string(),
		slug: z.string(),
		description: z.string(),
		type: examTypeSchema,
		tags: z.array(studentExamTagSchema),
		createdAtUtc: dateTimeSchema,
		updatedAtUtc: dateTimeSchema.nullable(),
	}),
	publishedVersion: z.object({
		id: uuidSchema,
		versionNumber: positiveIntegerSchema,
		title: z.string(),
		description: z.string(),
		instructions: z.string(),
		durationMinutes: positiveIntegerSchema.nullable(),
		totalScore: nonnegativeNumberSchema,
		contentRevision: nonnegativeIntegerSchema,
		publishedAtUtc: dateTimeSchema,
	}),
	sections: z.array(z.object({
		id: uuidSchema,
		kind: examSectionKindSchema,
		title: z.string(),
		instructions: z.string(),
		stimulusText: z.string().nullable(),
		mediaUrl: z.string().nullable(),
		displayOrder: nonnegativeIntegerSchema,
		questionCount: nonnegativeIntegerSchema,
		totalPoints: nonnegativeNumberSchema,
		metadata: z.json().nullable(),
	})),
})

const nullableOptionalScoreSchema = nonnegativeNumberSchema.nullable().optional()

export const studentExamAttemptPageSchema = z.object({
	items: z.array(z.object({
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
	})),
	meta: paginationSchema,
})

export const createdExamAttemptSchema = z.object({
	attemptId: uuidSchema,
	revision: nonnegativeIntegerSchema,
})

export type ExamType = z.infer<typeof examTypeSchema>
export type ExamTagType = z.infer<typeof examTagTypeSchema>
export type ExamSectionKind = z.infer<typeof examSectionKindSchema>
export type ExamAttemptStatus = z.infer<typeof attemptStatusSchema>
export type StudentExamTag = z.infer<typeof studentExamTagSchema>
export type StudentExamPage = z.infer<typeof studentExamPageSchema>
export type StudentExam = StudentExamPage["items"][number]
export type StudentExamFilters = z.infer<typeof studentExamFiltersSchema>
export type StudentExamFilterGroup = StudentExamFilters["groups"][number]
export type StudentExamFilterItem = StudentExamFilterGroup["items"][number]
export type StudentExamCategory = z.infer<
	typeof studentExamCategoriesSchema
>[number]
export type StudentExamDetail = z.infer<typeof studentExamDetailSchema>
export type StudentExamSection = StudentExamDetail["sections"][number]
export type StudentExamAttemptPage = z.infer<
	typeof studentExamAttemptPageSchema
>
export type StudentExamAttempt = StudentExamAttemptPage["items"][number]
export type CreatedExamAttempt = z.infer<typeof createdExamAttemptSchema> & {
	etag?: string
}
