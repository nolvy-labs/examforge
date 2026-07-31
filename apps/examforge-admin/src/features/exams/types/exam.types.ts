import type { z } from "zod"

import type {
	adminExamListRequestSchema,
	adminExamListResponseSchema,
	adminExamSchema,
	adminExamTagSchema,
	adminExamTagSummarySchema,
	createExamRequestSchema,
	createExamResponseSchema,
	examArchiveFilterSchema,
	examSortOrderSchema,
	examTypeSchema,
	paginationMetaSchema,
	quickCreateExamFormSchema,
} from "./exam.schema"

export type ExamType = z.infer<typeof examTypeSchema>
export type ExamArchiveFilter = z.infer<typeof examArchiveFilterSchema>
export type ExamSortOrder = z.infer<typeof examSortOrderSchema>

export type AdminExamTagSummary = z.infer<typeof adminExamTagSummarySchema>
export type AdminExamTag = z.infer<typeof adminExamTagSchema>
export type PaginationMeta = z.infer<typeof paginationMetaSchema>
export type AdminExamSummary = z.infer<typeof adminExamSchema>
export type AdminExamListResponse = z.infer<typeof adminExamListResponseSchema>
export type CreateExamResponse = z.infer<typeof createExamResponseSchema>

export type AdminExamListRequest = z.infer<typeof adminExamListRequestSchema>
export type CreateExamRequest = z.infer<typeof createExamRequestSchema>
export type QuickCreateExamFormInput = z.input<
	typeof quickCreateExamFormSchema
>
export type QuickCreateExamFormValues = z.output<
	typeof quickCreateExamFormSchema
>
