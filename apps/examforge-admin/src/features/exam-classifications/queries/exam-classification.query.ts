import { queryOptions, skipToken } from "@tanstack/react-query"

import {
	getAdminExamCategories,
	getAdminExamCategory,
	getAdminExamTag,
	getAdminExamTags,
} from "@/features/exam-classifications/api/exam-classification.api"
import {
	examCategoryIdSchema,
	examTagIdSchema,
} from "@/features/exam-classifications/types/exam-classification.schema"
import type {
	AdminExamCategoryListFilter,
	AdminExamTagListFilter,
} from "@/features/exam-classifications/types/exam-classification.types"

import {
	examClassificationQueryKeys,
	normalizeAdminExamCategoryListFilters,
	normalizeAdminExamTagListFilters,
} from "./exam-classification.query-key"

const CLASSIFICATION_METADATA_STALE_TIME = 15 * 60 * 1_000

function getValidId(id: string | null | undefined, schema: typeof examTagIdSchema) {
	const result = schema.safeParse(id)
	return result.success ? result.data.toLowerCase() : null
}

export function adminExamTagListQueryOptions(
	filters: AdminExamTagListFilter = {}
) {
	const normalized = normalizeAdminExamTagListFilters(filters)

	return queryOptions({
		queryKey: examClassificationQueryKeys.tags.list(filters),
		queryFn: ({ signal }) =>
			getAdminExamTags(
				{
					type: normalized.type ?? undefined,
					includeArchived: normalized.includeArchived,
				},
				signal
			),
		staleTime: CLASSIFICATION_METADATA_STALE_TIME,
	})
}

export function adminExamTagDetailQueryOptions(id?: string | null) {
	const tagId = getValidId(id, examTagIdSchema)

	return queryOptions({
		queryKey: examClassificationQueryKeys.tags.detail(tagId),
		queryFn: tagId
			? ({ signal }) => getAdminExamTag(tagId, signal)
			: skipToken,
		staleTime: CLASSIFICATION_METADATA_STALE_TIME,
	})
}

export function adminExamCategoryListQueryOptions(
	filters: AdminExamCategoryListFilter = {}
) {
	const normalized = normalizeAdminExamCategoryListFilters(filters)

	return queryOptions({
		queryKey: examClassificationQueryKeys.categories.list(normalized),
		queryFn: ({ signal }) =>
			getAdminExamCategories(
				{ isArchived: normalized.isArchived },
				signal
			),
		staleTime: CLASSIFICATION_METADATA_STALE_TIME,
	})
}

export function adminExamCategoryDetailQueryOptions(id?: string | null) {
	const categoryId = getValidId(id, examCategoryIdSchema)

	return queryOptions({
		queryKey: examClassificationQueryKeys.categories.detail(categoryId),
		queryFn: categoryId
			? ({ signal }) => getAdminExamCategory(categoryId, signal)
			: skipToken,
		staleTime: CLASSIFICATION_METADATA_STALE_TIME,
	})
}
