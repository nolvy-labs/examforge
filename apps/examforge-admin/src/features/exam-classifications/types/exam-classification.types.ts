import type { z } from "zod"

import type {
	adminExamCategoriesResponseSchema,
	adminExamCategoryListFilterSchema,
	adminExamCategorySchema,
	adminExamCategoryTagSchema,
	adminExamTagListFilterSchema,
	adminExamTagSchema,
	adminExamTagSummarySchema,
	adminExamTagsResponseSchema,
	assignableExamCategoryMatchModeSchema,
	assignableExamTagTypeSchema,
	createExamCategoryRequestSchema,
	createExamTagRequestSchema,
	examCategoryDisplayOrderSchema,
	examCategoryFormSchema,
	examCategoryIdSchema,
	examCategoryMatchModeSchema,
	examTagFormSchema,
	examTagIdSchema,
	examTagTypeSchema,
	updateExamCategoryRequestSchema,
	updateExamTagRequestSchema,
} from "./exam-classification.schema"

export type ExamTagId = z.infer<typeof examTagIdSchema>
export type ExamTagType = z.infer<typeof examTagTypeSchema>
export type AssignableExamTagType = z.infer<
	typeof assignableExamTagTypeSchema
>
export type AdminExamTagSummary = z.infer<typeof adminExamTagSummarySchema>
export type AdminExamTag = z.infer<typeof adminExamTagSchema>
export type AdminExamTagsResponse = z.infer<
	typeof adminExamTagsResponseSchema
>
export type AdminExamTagListFilter = z.infer<
	typeof adminExamTagListFilterSchema
>
export type CreateExamTagRequest = z.infer<typeof createExamTagRequestSchema>
export type UpdateExamTagRequest = z.infer<typeof updateExamTagRequestSchema>
export type ExamTagFormInput = z.input<typeof examTagFormSchema>
export type ExamTagFormValues = z.output<typeof examTagFormSchema>

export type ExamCategoryId = z.infer<typeof examCategoryIdSchema>
export type ExamCategoryMatchMode = z.infer<
	typeof examCategoryMatchModeSchema
>
export type ExamCategoryDisplayOrder = z.infer<
	typeof examCategoryDisplayOrderSchema
>
export type AssignableExamCategoryMatchMode = z.infer<
	typeof assignableExamCategoryMatchModeSchema
>
export type AdminExamCategoryTag = z.infer<
	typeof adminExamCategoryTagSchema
>
export type AdminExamCategory = z.infer<typeof adminExamCategorySchema>
export type AdminExamCategoriesResponse = z.infer<
	typeof adminExamCategoriesResponseSchema
>
export type AdminExamCategoryListFilter = z.infer<
	typeof adminExamCategoryListFilterSchema
>
export type CreateExamCategoryRequest = z.infer<
	typeof createExamCategoryRequestSchema
>
export type UpdateExamCategoryRequest = z.infer<
	typeof updateExamCategoryRequestSchema
>
export type ExamCategoryFormInput = z.input<typeof examCategoryFormSchema>
export type ExamCategoryFormValues = z.output<typeof examCategoryFormSchema>
