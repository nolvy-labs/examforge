import type {
	AdminExamCategory,
	AdminExamTag,
} from "@/features/exam-classifications/types/exam-classification.types"

import type {
	CategoryManagementState,
	TagManagementState,
} from "./classification-management-query"

const collator = new Intl.Collator("en", {
	sensitivity: "base",
	numeric: true,
})

function includesSearch(
	item: { name: string; slug: string; description: string },
	search: string
) {
	const value = search.trim().toLocaleLowerCase("en-US")
	if (!value) return true

	return [item.name, item.slug, item.description].some((field) =>
		field.toLocaleLowerCase("en-US").includes(value)
	)
}

function compareDate(left: string, right: string) {
	return new Date(left).getTime() - new Date(right).getTime()
}

export function getVisibleAdminExamTags(
	tags: readonly AdminExamTag[],
	state: TagManagementState
) {
	return tags
		.filter((tag) => state.archive !== "archived" || tag.isArchived)
		.filter((tag) => includesSearch(tag, state.search))
		.toSorted((left, right) => {
			switch (state.sort) {
				case "name-desc":
					return collator.compare(right.name, left.name) ||
						collator.compare(right.slug, left.slug)
				case "type":
					return left.type - right.type || collator.compare(left.name, right.name)
				case "newest":
					return compareDate(right.createdAtUtc, left.createdAtUtc) ||
						collator.compare(left.name, right.name)
				case "oldest":
					return compareDate(left.createdAtUtc, right.createdAtUtc) ||
						collator.compare(left.name, right.name)
				case "name-asc":
				default:
					return collator.compare(left.name, right.name) ||
						collator.compare(left.slug, right.slug)
			}
		})
}

export function getAdminExamTagServerFilters(state: TagManagementState) {
	return {
		type: state.type ?? undefined,
		includeArchived: state.archive !== "active",
	}
}

export function getVisibleAdminExamCategories(
	categories: readonly AdminExamCategory[],
	state: CategoryManagementState
) {
	return categories
		.filter((category) => includesSearch(category, state.search))
		.filter(
			(category) =>
				state.matchMode === null || category.matchMode === state.matchMode
		)
		.filter((category) => {
			if (state.featured === "featured") return category.isFeatured
			if (state.featured === "not-featured") return !category.isFeatured
			return true
		})
		.toSorted((left, right) => {
			switch (state.sort) {
				case "name-asc":
					return collator.compare(left.name, right.name)
				case "name-desc":
					return collator.compare(right.name, left.name)
				case "newest":
					return compareDate(right.createdAtUtc, left.createdAtUtc) ||
						collator.compare(left.name, right.name)
				case "oldest":
					return compareDate(left.createdAtUtc, right.createdAtUtc) ||
						collator.compare(left.name, right.name)
				case "display-order":
				default:
					return left.displayOrder - right.displayOrder ||
						collator.compare(left.name, right.name)
			}
		})
}

export function getAdminExamCategoryServerFilters(
	state: CategoryManagementState
) {
	return {
		isArchived:
			state.archive === "active"
				? false
				: state.archive === "archived"
					? true
					: null,
	}
}

export function suggestClassificationSlug(name: string) {
	return name.trim().toLocaleLowerCase("en-US").replaceAll(" ", "-")
}
