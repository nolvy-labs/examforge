import type { z } from "zod"

import type {
	examSectionKindSchema,
	examTagTypeSchema,
	examTypeSchema,
	studentExamCategoriesSchema,
	studentExamDetailSchema,
	studentExamFiltersSchema,
	studentExamPageSchema,
	studentExamTagSchema,
} from "./exam.schema"

export type ExamType = z.infer<typeof examTypeSchema>
export type ExamTagType = z.infer<typeof examTagTypeSchema>
export type ExamSectionKind = z.infer<typeof examSectionKindSchema>
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
