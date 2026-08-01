import { z } from "zod"

import {
	assignableExamCategoryMatchModeSchema,
	assignableExamTagTypeSchema,
} from "@/features/exam-classifications/types/exam-classification.schema"

const QUERY_KEYS = [
	"tab",
	"search",
	"archive",
	"sort",
	"type",
	"matchMode",
	"featured",
] as const

export const classificationTabSchema = z.enum(["tags", "categories"])
export const classificationArchiveFilterSchema = z.enum([
	"active",
	"archived",
	"all",
])
export const tagSortSchema = z.enum([
	"name-asc",
	"name-desc",
	"type",
	"newest",
	"oldest",
])
export const categorySortSchema = z.enum([
	"display-order",
	"name-asc",
	"name-desc",
	"newest",
	"oldest",
])
export const categoryFeaturedFilterSchema = z.enum([
	"all",
	"featured",
	"not-featured",
])

const sharedState = {
	search: z.string(),
	archive: classificationArchiveFilterSchema,
}

export const tagManagementStateSchema = z.strictObject({
	tab: z.literal("tags"),
	...sharedState,
	type: assignableExamTagTypeSchema.nullable(),
	sort: tagSortSchema,
})

export const categoryManagementStateSchema = z.strictObject({
	tab: z.literal("categories"),
	...sharedState,
	matchMode: assignableExamCategoryMatchModeSchema.nullable(),
	featured: categoryFeaturedFilterSchema,
	sort: categorySortSchema,
})

export const classificationManagementStateSchema = z.discriminatedUnion(
	"tab",
	[tagManagementStateSchema, categoryManagementStateSchema]
)

export type ClassificationTab = z.infer<typeof classificationTabSchema>
export type ClassificationArchiveFilter = z.infer<
	typeof classificationArchiveFilterSchema
>
export type TagSort = z.infer<typeof tagSortSchema>
export type CategorySort = z.infer<typeof categorySortSchema>
export type CategoryFeaturedFilter = z.infer<
	typeof categoryFeaturedFilterSchema
>
export type TagManagementState = z.infer<typeof tagManagementStateSchema>
export type CategoryManagementState = z.infer<
	typeof categoryManagementStateSchema
>
export type ClassificationManagementState = z.infer<
	typeof classificationManagementStateSchema
>

const tagTypeFromQuery = {
	subject: 1,
	"exam-type": 2,
	year: 3,
	grade: 4,
	skill: 5,
	level: 6,
	topic: 7,
} as const

const tagTypeToQuery = {
	1: "subject",
	2: "exam-type",
	3: "year",
	4: "grade",
	5: "skill",
	6: "level",
	7: "topic",
} as const

export function getDefaultClassificationState(
	tab: ClassificationTab
): ClassificationManagementState {
	return tab === "categories"
		? {
				tab,
				search: "",
				archive: "active",
				matchMode: null,
				featured: "all",
				sort: "display-order",
			}
		: {
				tab,
				search: "",
				archive: "active",
				type: null,
				sort: "name-asc",
			}
}

function parseArchive(value: string | null): ClassificationArchiveFilter {
	return value === "archived" || value === "all" ? value : "active"
}

export function parseClassificationManagementQuery(
	params: URLSearchParams
): ClassificationManagementState {
	const tab: ClassificationTab =
		params.get("tab") === "categories" ? "categories" : "tags"
	const search = (params.get("search") ?? "").trim()
	const archive = parseArchive(params.get("archive"))

	if (tab === "categories") {
		const matchValue = params.get("matchMode")
		const featuredValue = params.get("featured")
		const sortValue = params.get("sort")

		return categoryManagementStateSchema.parse({
			tab,
			search,
			archive,
			matchMode: matchValue === "all" ? 1 : matchValue === "any" ? 2 : null,
			featured:
				featuredValue === "featured" || featuredValue === "not-featured"
					? featuredValue
					: "all",
			sort: categorySortSchema.safeParse(sortValue).success
				? sortValue
				: "display-order",
		})
	}

	const typeValue = params.get("type") as keyof typeof tagTypeFromQuery | null
	const sortValue = params.get("sort")

	return tagManagementStateSchema.parse({
		tab,
		search,
		archive,
		type: typeValue ? (tagTypeFromQuery[typeValue] ?? null) : null,
		sort: tagSortSchema.safeParse(sortValue).success
			? sortValue
			: "name-asc",
	})
}

export function serializeClassificationManagementQuery(
	state: ClassificationManagementState,
	current?: URLSearchParams
) {
	const normalized = classificationManagementStateSchema.parse(state)
	const params = new URLSearchParams(current)
	for (const key of QUERY_KEYS) params.delete(key)

	if (normalized.tab === "categories") params.set("tab", "categories")
	if (normalized.search) params.set("search", normalized.search.trim())
	if (normalized.archive !== "active") {
		params.set("archive", normalized.archive)
	}

	if (normalized.tab === "tags") {
		if (normalized.type !== null) {
			params.set("type", tagTypeToQuery[normalized.type])
		}
		if (normalized.sort !== "name-asc") params.set("sort", normalized.sort)
	} else {
		if (normalized.matchMode !== null) {
			params.set("matchMode", normalized.matchMode === 1 ? "all" : "any")
		}
		if (normalized.featured !== "all") {
			params.set("featured", normalized.featured)
		}
		if (normalized.sort !== "display-order") {
			params.set("sort", normalized.sort)
		}
	}

	return params
}

export function getNormalizedClassificationManagementQuery(
	params: URLSearchParams
) {
	return serializeClassificationManagementQuery(
		parseClassificationManagementQuery(params),
		params
	).toString()
}

export function updateClassificationManagementState(
	state: ClassificationManagementState,
	patch: Record<string, unknown>
) {
	return classificationManagementStateSchema.parse({ ...state, ...patch })
}
