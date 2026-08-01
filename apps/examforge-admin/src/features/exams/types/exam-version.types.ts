import type { z } from "zod"

import type {
	bulkUpdateExamVersionContentRequestSchema,
	bulkUpdateExamVersionContentResponseSchema,
	concurrencyMetadataSchema,
	createExamSectionRequestSchema,
	createExamVersionRequestSchema,
	createFillAnswerKeyRequestSchema,
	createQuestionOptionRequestSchema,
	createQuestionRequestSchema,
	examBuilderProblemDetailsSchema,
	examSectionDetailResponseSchema,
	examSectionSummaryListResponseSchema,
	examSectionSummaryResponseSchema,
	examSectionKindSchema,
	examVersionDetailResponseSchema,
	examVersionListResponseSchema,
	examVersionStatusSchema,
	examVersionSummaryResponseSchema,
	fillAnswerKeyResponseSchema,
	fullExamVersionResponseSchema,
	getExamVersionsRequestSchema,
	patchOperationSchema,
	questionDetailResponseSchema,
	questionSummaryListResponseSchema,
	questionSummaryResponseSchema,
	questionOptionResponseSchema,
	questionTypeSchema,
	reorderExamSectionsRequestSchema,
	reorderQuestionOptionsRequestSchema,
	reorderQuestionsRequestSchema,
} from "./exam-version.schema"

export type ExamVersionStatusDto = z.infer<typeof examVersionStatusSchema>
export type ExamSectionKindDto = z.infer<typeof examSectionKindSchema>
export type QuestionTypeDto = z.infer<typeof questionTypeSchema>
export type ExamVersionSummaryDto = z.infer<
	typeof examVersionSummaryResponseSchema
>
export type ExamVersionDetailDto = z.infer<typeof examVersionDetailResponseSchema>
export type FullExamVersionDto = z.infer<typeof fullExamVersionResponseSchema>
export type ExamSectionDetailDto = z.infer<typeof examSectionDetailResponseSchema>
export type ExamSectionSummaryDto = z.infer<typeof examSectionSummaryResponseSchema>
export type ExamSectionSummaryListResponse = z.infer<
	typeof examSectionSummaryListResponseSchema
>
export type QuestionDetailDto = z.infer<typeof questionDetailResponseSchema>
export type QuestionSummaryDto = z.infer<typeof questionSummaryResponseSchema>
export type QuestionSummaryListResponse = z.infer<
	typeof questionSummaryListResponseSchema
>
export type QuestionOptionDto = z.infer<typeof questionOptionResponseSchema>
export type FillAnswerKeyDto = z.infer<typeof fillAnswerKeyResponseSchema>
export type GetExamVersionsRequest = z.infer<typeof getExamVersionsRequestSchema>
export type ExamVersionListResponse = z.infer<typeof examVersionListResponseSchema>
export type CreateExamVersionRequest = z.infer<
	typeof createExamVersionRequestSchema
>
export type CreateExamSectionRequest = z.infer<
	typeof createExamSectionRequestSchema
>
export type CreateQuestionRequest = z.infer<typeof createQuestionRequestSchema>
export type CreateQuestionOptionRequest = z.infer<
	typeof createQuestionOptionRequestSchema
>
export type CreateFillAnswerKeyRequest = z.infer<
	typeof createFillAnswerKeyRequestSchema
>
export type ReorderExamSectionsRequest = z.infer<
	typeof reorderExamSectionsRequestSchema
>
export type ReorderQuestionsRequest = z.infer<typeof reorderQuestionsRequestSchema>
export type ReorderQuestionOptionsRequest = z.infer<
	typeof reorderQuestionOptionsRequestSchema
>
export type PatchOperation = z.infer<typeof patchOperationSchema>
export type BulkUpdateExamVersionContentRequest = z.infer<
	typeof bulkUpdateExamVersionContentRequestSchema
>
export type BulkUpdateExamVersionContentResponse = z.infer<
	typeof bulkUpdateExamVersionContentResponseSchema
>
export type ConcurrencyMetadata = z.infer<typeof concurrencyMetadataSchema>
export type ExamBuilderProblemDetails = z.infer<
	typeof examBuilderProblemDetailsSchema
>
