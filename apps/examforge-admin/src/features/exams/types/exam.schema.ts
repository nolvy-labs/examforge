import { z } from "zod"

import { adminExamTagSummarySchema } from "@/features/exam-classifications/types/exam-classification.schema"

import {
	apiDateTimeSchema,
	apiPositiveIntegerSchema,
	apiUuidSchema,
	collectionResponseSchema,
} from "./exam-contract.schema"
import {
	createInitialExamVersionInputSchema,
	examVersionDetailResponseSchema,
} from "./exam-version.schema"

export { paginationMetaSchema } from "./exam-contract.schema"

export const EXAM_PAGE_SIZE = 20 as const
export const EXAM_TITLE_MAX_LENGTH = 200
export const EXAM_DESCRIPTION_MAX_LENGTH = 2_000
export const EXAM_MAX_TAGS = 20
export const EXAM_SEARCH_MAX_LENGTH = 200

export const examTypeSchema = z.union([z.literal(0), z.literal(1)])
export const examArchiveFilterSchema = z.enum(["active", "archived", "all"])
export const examSortOrderSchema = z.enum(["newest", "oldest"])

export const adminExamSchema = z.strictObject({
	id: apiUuidSchema,
	title: z.string().min(1).max(EXAM_TITLE_MAX_LENGTH),
	slug: z.string().min(1).max(220),
	description: z.string().max(EXAM_DESCRIPTION_MAX_LENGTH),
	type: examTypeSchema,
	tags: z.array(adminExamTagSummarySchema),
	isArchived: z.boolean(),
	createdAtUtc: apiDateTimeSchema,
	updatedAtUtc: apiDateTimeSchema.nullable(),
	initialVersion: examVersionDetailResponseSchema.nullable(),
})

export const adminExamListResponseSchema = collectionResponseSchema(adminExamSchema)
export const createExamResponseSchema = adminExamSchema

const uniqueTagIdsSchema = z
	.array(apiUuidSchema)
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
	initialVersion: createInitialExamVersionInputSchema.nullable().optional(),
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
	page: apiPositiveIntegerSchema,
	pageSize: z.literal(EXAM_PAGE_SIZE),
	search: z.string().max(EXAM_SEARCH_MAX_LENGTH).optional(),
	tagIds: z.array(apiUuidSchema),
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
		initialVersion: {},
	})
}
