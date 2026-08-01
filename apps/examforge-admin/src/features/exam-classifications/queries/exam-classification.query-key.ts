import {
	adminExamCategoryListFilterSchema,
	adminExamTagListFilterSchema,
} from "@/features/exam-classifications/types/exam-classification.schema"
import type {
	AdminExamCategoryListFilter,
	AdminExamTagListFilter,
} from "@/features/exam-classifications/types/exam-classification.types"

const all = ["admin-exam-classifications"] as const
const allTags = [...all, "tags"] as const
const allTagLists = [...allTags, "lists"] as const
const allTagDetails = [...allTags, "details"] as const
const allCategories = [...all, "categories"] as const
const allCategoryLists = [...allCategories, "lists"] as const
const allCategoryDetails = [...allCategories, "details"] as const

export function normalizeAdminExamTagListFilters(
	filters: AdminExamTagListFilter = {}
) {
	const normalized = adminExamTagListFilterSchema.parse(filters)

	return {
		type: normalized.type ?? null,
		includeArchived: normalized.includeArchived ?? true,
	}
}

export function normalizeAdminExamCategoryListFilters(
	filters: AdminExamCategoryListFilter = {}
) {
	const normalized = adminExamCategoryListFilterSchema.parse(filters)

	return {
		isArchived: normalized.isArchived ?? null,
	}
}

export const examClassificationQueryKeys = {
	all,
	tags: {
		all: allTags,
		lists: () => allTagLists,
		list: (filters: AdminExamTagListFilter = {}) =>
			[
				...allTagLists,
				normalizeAdminExamTagListFilters(filters),
			] as const,
		details: () => allTagDetails,
		detail: (id: string | null) => [...allTagDetails, id] as const,
	},
	categories: {
		all: allCategories,
		lists: () => allCategoryLists,
		list: (filters: AdminExamCategoryListFilter = {}) =>
			[
				...allCategoryLists,
				normalizeAdminExamCategoryListFilters(filters),
			] as const,
		details: () => allCategoryDetails,
		detail: (id: string | null) => [...allCategoryDetails, id] as const,
	},
}

export const examClassificationMutationKeys = {
	tags: {
		create: [...allTags, "create"] as const,
		update: [...allTags, "update"] as const,
		archive: [...allTags, "archive"] as const,
		restore: [...allTags, "restore"] as const,
	},
	categories: {
		create: [...allCategories, "create"] as const,
		update: [...allCategories, "update"] as const,
		archive: [...allCategories, "archive"] as const,
		restore: [...allCategories, "restore"] as const,
	},
}
