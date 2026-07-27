export type ExamBrowseSort = "newest" | "oldest"

export interface ExamBrowseState {
	search: string
	category: string
	tagIds: string[]
	sort: ExamBrowseSort
	page: number
}

export type {
	ExamTagType,
	ExamType,
	StudentExamCategory,
	StudentExam,
	StudentExamFilterGroup,
	StudentExamFilterItem,
	StudentExamFilters,
	StudentExamPage,
	StudentExamTag,
} from "./exam.schema"
