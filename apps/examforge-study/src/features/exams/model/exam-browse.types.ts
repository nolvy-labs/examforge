export type ExamBrowseSort = "newest" | "oldest"

export interface ExamBrowseState {
	search: string
	category: string
	tagIds: string[]
	sort: ExamBrowseSort
	page: number
}

export interface StudentExamTag {
	id: string
	name: string
	slug: string
	type: string | number
}

export interface StudentExam {
	id: string
	title: string
	slug: string
	description: string
	type: string | number
	tags: StudentExamTag[]
	publishedVersion: {
		id: string
		versionNumber: number
		title: string
		durationMinutes: number | null
		totalScore: number
		sectionCount: number
		questionCount: number
		publishedAtUtc: string
	}
	createdAtUtc: string
	updatedAtUtc: string | null
}

export interface StudentExamPage {
	items: StudentExam[]
	meta: {
		page: number
		pageSize: number
		totalItems: number
		totalPages: number
		hasPreviousPage: boolean
		hasNextPage: boolean
	}
}

export interface StudentExamFilterItem {
	id: string
	name: string
	slug: string
	examCount: number
}

export interface StudentExamFilterGroup {
	type: string | number
	items: StudentExamFilterItem[]
}

export interface StudentExamFilters {
	groups: StudentExamFilterGroup[]
}

export interface StudentExamCategory {
	id: string
	name: string
	slug: string
	description: string
	isFeatured: boolean
	examCount: number
	tags: StudentExamTag[]
}
