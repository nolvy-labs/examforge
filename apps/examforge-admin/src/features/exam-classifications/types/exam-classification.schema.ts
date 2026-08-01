import { z } from "zod"

export const EXAM_CLASSIFICATION_NAME_MAX_LENGTH = 128
export const EXAM_CLASSIFICATION_SLUG_MAX_LENGTH = 160
export const EXAM_CLASSIFICATION_DESCRIPTION_MAX_LENGTH = 1_000
export const EXAM_CATEGORY_DISPLAY_ORDER_MIN = -2_147_483_648
export const EXAM_CATEGORY_DISPLAY_ORDER_MAX = 2_147_483_647

const dateTimeSchema = z.iso.datetime({ offset: true })

function normalizedNameLength(value: string) {
	return value.trim().normalize("NFC").replace(/\s+/gu, " ").length
}

const classificationNameSchema = z
	.string()
	.refine((value) => normalizedNameLength(value) > 0, {
		message: "Name is required.",
	})
	.refine(
		(value) =>
			normalizedNameLength(value) <= EXAM_CLASSIFICATION_NAME_MAX_LENGTH,
		{
			message: `Name must be ${EXAM_CLASSIFICATION_NAME_MAX_LENGTH} characters or fewer.`,
		}
	)

const optionalSlugSourceSchema = z.string().refine(
	(value) => value.trim().toLowerCase().replaceAll(" ", "-").length <=
		EXAM_CLASSIFICATION_SLUG_MAX_LENGTH,
	{
		message: `Slug must be ${EXAM_CLASSIFICATION_SLUG_MAX_LENGTH} characters or fewer.`,
	}
)

const responseSlugSchema = z
	.string()
	.min(1)
	.max(EXAM_CLASSIFICATION_SLUG_MAX_LENGTH)

const tagDescriptionSchema = z.string().refine(
	(value) => value.trim().length <= EXAM_CLASSIFICATION_DESCRIPTION_MAX_LENGTH,
	{
		message: `Description must be ${EXAM_CLASSIFICATION_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
	}
)

const categoryDescriptionSchema = tagDescriptionSchema.refine(
	(value) => value.trim().length > 0,
	{ message: "Description is required." }
)

const responseDescriptionSchema = z
	.string()
	.max(EXAM_CLASSIFICATION_DESCRIPTION_MAX_LENGTH)

export const examTagIdSchema = z.uuid()
export const examCategoryIdSchema = z.uuid()

export const examTagTypeSchema = z.union([
	z.literal(0),
	z.literal(1),
	z.literal(2),
	z.literal(3),
	z.literal(4),
	z.literal(5),
	z.literal(6),
	z.literal(7),
])

export const assignableExamTagTypeSchema = z.union([
	z.literal(1),
	z.literal(2),
	z.literal(3),
	z.literal(4),
	z.literal(5),
	z.literal(6),
	z.literal(7),
])

export const EXAM_TAG_TYPE_LABELS = {
	0: "Unknown",
	1: "Subject",
	2: "Exam type",
	3: "Year",
	4: "Grade",
	5: "Skill",
	6: "Level",
	7: "Topic",
} as const satisfies Record<z.infer<typeof examTagTypeSchema>, string>

export const adminExamTagSummarySchema = z.strictObject({
	id: examTagIdSchema,
	name: z.string().min(1).max(EXAM_CLASSIFICATION_NAME_MAX_LENGTH),
	slug: responseSlugSchema,
	type: examTagTypeSchema,
	isArchived: z.boolean(),
})

export const adminExamTagSchema = z.strictObject({
	...adminExamTagSummarySchema.shape,
	description: responseDescriptionSchema,
	createdAtUtc: dateTimeSchema,
	updatedAtUtc: dateTimeSchema.nullable(),
})

export const adminExamTagsResponseSchema = z.array(adminExamTagSchema)

export const adminExamTagListFilterSchema = z.strictObject({
	type: examTagTypeSchema.optional(),
	includeArchived: z.boolean().optional(),
})

export const createExamTagRequestSchema = z.strictObject({
	name: classificationNameSchema,
	slug: optionalSlugSourceSchema.nullable(),
	description: tagDescriptionSchema,
	type: assignableExamTagTypeSchema,
})

export const updateExamTagRequestSchema = z.strictObject({
	name: classificationNameSchema.nullable().optional(),
	slug: optionalSlugSourceSchema.nullable().optional(),
	description: tagDescriptionSchema.nullable().optional(),
	type: assignableExamTagTypeSchema.nullable().optional(),
})

export const examTagFormSchema = z.strictObject({
	name: classificationNameSchema,
	slug: optionalSlugSourceSchema,
	description: tagDescriptionSchema,
	type: assignableExamTagTypeSchema,
})

export const examCategoryMatchModeSchema = z.union([
	z.literal(0),
	z.literal(1),
	z.literal(2),
])

export const assignableExamCategoryMatchModeSchema = z.union([
	z.literal(1),
	z.literal(2),
])

export const EXAM_CATEGORY_MATCH_MODE_LABELS = {
	0: "Unknown",
	1: "All",
	2: "Any",
} as const satisfies Record<
	z.infer<typeof examCategoryMatchModeSchema>,
	string
>

export const examCategoryDisplayOrderSchema = z
	.number()
	.int()
	.min(EXAM_CATEGORY_DISPLAY_ORDER_MIN)
	.max(EXAM_CATEGORY_DISPLAY_ORDER_MAX)

export const adminExamCategoryTagSchema = z.strictObject({
	id: examTagIdSchema,
	name: z.string().min(1).max(EXAM_CLASSIFICATION_NAME_MAX_LENGTH),
	slug: responseSlugSchema,
	type: examTagTypeSchema,
})

export const adminExamCategorySchema = z.strictObject({
	id: examCategoryIdSchema,
	name: z.string().min(1).max(EXAM_CLASSIFICATION_NAME_MAX_LENGTH),
	slug: responseSlugSchema,
	description: responseDescriptionSchema,
	matchMode: examCategoryMatchModeSchema,
	isFeatured: z.boolean(),
	isArchived: z.boolean(),
	displayOrder: examCategoryDisplayOrderSchema,
	createdAtUtc: dateTimeSchema,
	updatedAtUtc: dateTimeSchema.nullable(),
	tags: z.array(adminExamCategoryTagSchema),
})

export const adminExamCategoriesResponseSchema = z.array(
	adminExamCategorySchema
)

export const adminExamCategoryListFilterSchema = z.strictObject({
	isArchived: z.boolean().nullable().optional(),
})

const uniqueExamTagIdsSchema = z.array(examTagIdSchema).refine(
	(tagIds) =>
		new Set(tagIds.map((tagId) => tagId.toLowerCase())).size ===
		tagIds.length,
	{ message: "Each tag can be selected only once." }
)

export const createExamCategoryRequestSchema = z.strictObject({
	name: classificationNameSchema,
	slug: optionalSlugSourceSchema.nullable(),
	description: categoryDescriptionSchema,
	matchMode: assignableExamCategoryMatchModeSchema,
	isFeatured: z.boolean(),
	displayOrder: examCategoryDisplayOrderSchema,
	examTagIds: uniqueExamTagIdsSchema.nullable(),
})

export const updateExamCategoryRequestSchema = z.strictObject({
	name: classificationNameSchema.nullable().optional(),
	slug: optionalSlugSourceSchema.nullable().optional(),
	description: categoryDescriptionSchema.nullable().optional(),
	matchMode: assignableExamCategoryMatchModeSchema.nullable().optional(),
	isFeatured: z.boolean().nullable().optional(),
	displayOrder: examCategoryDisplayOrderSchema.nullable().optional(),
	examTagIds: uniqueExamTagIdsSchema.nullable().optional(),
})

export const examCategoryFormSchema = z.strictObject({
	name: classificationNameSchema,
	slug: optionalSlugSourceSchema,
	description: categoryDescriptionSchema,
	matchMode: assignableExamCategoryMatchModeSchema,
	isFeatured: z.boolean(),
	displayOrder: examCategoryDisplayOrderSchema,
	examTagIds: uniqueExamTagIdsSchema,
})

export function mapExamTagFormToCreateRequest(
	values: z.output<typeof examTagFormSchema>
) {
	return createExamTagRequestSchema.parse({
		...values,
		slug: values.slug.trim() || null,
	})
}

export function mapExamCategoryFormToCreateRequest(
	values: z.output<typeof examCategoryFormSchema>
) {
	return createExamCategoryRequestSchema.parse({
		...values,
		slug: values.slug.trim() || null,
	})
}
