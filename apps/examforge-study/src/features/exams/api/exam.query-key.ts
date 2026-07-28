export const EXAM_PAGE_SIZE = 12

export interface ExamQueryState {
	search: string
	category: string
	tagIds: string[]
	sort: "newest" | "oldest"
	page: number
}

export const examQueryKeys = {
	browse: (state: ExamQueryState) =>
		[
			"student-exams",
			state.search,
			state.category,
			state.tagIds,
			state.sort,
			state.page,
			EXAM_PAGE_SIZE,
		] as const,
	filters: () => ["student-exam-filters"] as const,
	categories: () =>
		["student-exam-categories", { featuredOnly: false }] as const,
}
