"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
	useStudentExamCategories,
	useStudentExamFilters,
	useStudentExams,
} from "../../api/exam.query"
import type {
	StudentExamCategory,
	StudentExamFilterGroup,
	StudentExamPage,
} from "../../types/exam.types"
import {
	getInvalidExamTagIds,
	isInvalidExamCategoryError,
} from "../model/exam-browse-error"
import {
	getNormalizedExamBrowseQuery,
	parseExamBrowseQuery,
	type ExamBrowseSort,
} from "../model/exam-browse-query"
import {
	useDebouncedExamBrowseSearch,
	useExamBrowseNavigation,
} from "./use-exam-browse-navigation"

export interface ExamBrowseFilterData {
	categories?: StudentExamCategory[]
	groups?: StudentExamFilterGroup[]
	categoryError: boolean
	tagError: boolean
	onRetryCategories: () => void
	onRetryTags: () => void
}

export interface ExamBrowseFiltersViewModel {
	data: ExamBrowseFilterData
	category: string
	tagIds: string[]
	activeCount: number
	activeCategoryName?: string
	activeTags: Array<{ id: string; name: string }>
	onCategoryChange: (category: string) => void
	onTagChange: (id: string, checked: boolean) => void
	onApply: (category: string, tagIds: string[]) => void
	onClearSearch: () => void
	onClearCategory: () => void
	onRemoveTag: (id: string) => void
	onClearFilters: () => void
	onClearAll: () => void
}

export interface ExamBrowseResultsViewModel {
	data?: StudentExamPage
	sort: ExamBrowseSort
	isInitialLoading: boolean
	isError: boolean
	isFetching: boolean
	isPlaceholderData: boolean
	hasDiscoveryFilters: boolean
	onSortChange: (sort: ExamBrowseSort) => void
	onRetry: () => void
	onPageChange: (page: number) => void
	onClear: () => void
}

export function focusExamResultsHeading(heading: HTMLHeadingElement | null) {
	if (!heading) return
	heading.focus({ preventScroll: true })
	heading.scrollIntoView({
		behavior: "smooth",
		block: "start",
	})
}

export function useExamBrowseQuery() {
	const pathname = usePathname()
	const router = useRouter()
	const searchParams = useSearchParams()
	const rawQuery = searchParams.toString()
	const state = useMemo(() => 
		parseExamBrowseQuery(new URLSearchParams(rawQuery)),
		[rawQuery]
	)
	const resultsHeadingRef = useRef<HTMLHeadingElement>(null)
	const correctionAttempts = useRef(new Set<string>())
	const examsQuery = useStudentExams(state)
	const filtersQuery = useStudentExamFilters()
	const categoriesQuery = useStudentExamCategories()

	const onNavigate = useCallback(
		(href: string, replace: boolean) => {
			if (replace) router.replace(href, { scroll: false })
			else router.push(href, { scroll: false })
		},
		[router]
	)
	const { navigate, update } = useExamBrowseNavigation({
		pathname,
		rawQuery,
		state,
		onNavigate,
	})
	const search = useDebouncedExamBrowseSearch(state.search, update)

	useEffect(() => {
		const normalized = getNormalizedExamBrowseQuery(
			new URLSearchParams(rawQuery)
		)
		if (normalized !== rawQuery) {
			router.replace(normalized ? `${pathname}?${normalized}` : pathname, {
				scroll: false,
			})
		}
	}, [pathname, rawQuery, router])

	useEffect(() => {
		const data = examsQuery.data
		if (!data || examsQuery.isPlaceholderData) return
		const finalPage = data.meta.totalPages === 0 ? 1 : data.meta.totalPages
		if (state.page <= finalPage) return

		const signature = `page:${rawQuery}`
		if (correctionAttempts.current.has(signature)) return
		correctionAttempts.current.add(signature)
		update({ page: finalPage }, { resetPage: false, replace: true })
	}, [examsQuery.data, examsQuery.isPlaceholderData, rawQuery, state.page, update])

	useEffect(() => {
		const error = examsQuery.error
		if (!error) return
		const signature = `error:${rawQuery}`
		if (correctionAttempts.current.has(signature)) return

		const invalidTagIds = getInvalidExamTagIds(error)
		if (invalidTagIds.length) {
			const invalid = new Set(invalidTagIds.map((id) => id.toLowerCase()))
			const remaining = state.tagIds.filter((id) => !invalid.has(id))
			if (remaining.length !== state.tagIds.length) {
				correctionAttempts.current.add(signature)
				update({ tagIds: remaining }, { replace: true })
				return
			}
		}

		if (state.category && isInvalidExamCategoryError(error)) {
			correctionAttempts.current.add(signature)
			update({ category: "" }, { replace: true })
		}
	}, [examsQuery.error, rawQuery, state.category, state.tagIds, update])

	const categoryBySlug = useMemo(
		() =>
			new Map(
				(categoriesQuery.data ?? []).map((category) => [
					category.slug,
					category,
				])
			),
		[categoriesQuery.data]
	)
	
	const tagById = useMemo(
		() =>
			new Map(
				(filtersQuery.data?.groups.flatMap((group) => group.items) ?? []).map(
					(tag) => [tag.id.toLowerCase(), tag]
				)
			),
		[filtersQuery.data]
	)

	const activeTags = state.tagIds.flatMap((id) => {
		const tag = tagById.get(id)
		return tag ? [{ id, name: tag.name }] : []
	})

	const clearAll = useCallback(() => {
		search.setValue("")
		navigate({
			search: "",
			category: "",
			tagIds: [],
			sort: "newest",
			page: 1,
		})
	}, [navigate, search])

	const filters: ExamBrowseFiltersViewModel = {
		data: {
			categories: categoriesQuery.data,
			groups: filtersQuery.data?.groups,
			categoryError: categoriesQuery.isError,
			tagError: filtersQuery.isError,
			onRetryCategories: () => void categoriesQuery.refetch(),
			onRetryTags: () => void filtersQuery.refetch(),
		},
		category: state.category,
		tagIds: state.tagIds,
		activeCount: (state.category ? 1 : 0) + state.tagIds.length,
		activeCategoryName: state.category
			? categoryBySlug.get(state.category)?.name
			: undefined,
		activeTags,
		onCategoryChange: (category) => update({ category }),
		onTagChange: (id, checked) =>
			update({
				tagIds: checked
					? Array.from(new Set([...state.tagIds, id])).sort()
					: state.tagIds.filter((tagId) => tagId !== id),
			}),
		onApply: (category, tagIds) => update({ category, tagIds }),
		onClearSearch: () => {
			search.setValue("")
			update({ search: "" })
		},
		onClearCategory: () => update({ category: "" }),
		onRemoveTag: (id) =>
			update({
				tagIds: state.tagIds.filter((tagId) => tagId !== id),
			}),
		onClearFilters: () => update({ category: "", tagIds: [] }),
		onClearAll: clearAll,
	}

	const results: ExamBrowseResultsViewModel = {
		data: examsQuery.data,
		sort: state.sort,
		isInitialLoading: examsQuery.isPending && !examsQuery.data,
		isError: examsQuery.isError,
		isFetching: examsQuery.isFetching,
		isPlaceholderData: examsQuery.isPlaceholderData,
		hasDiscoveryFilters: Boolean(
			state.search ||
				state.category ||
				state.tagIds.length ||
				state.sort !== "newest"
		),
		onSortChange: (sort) => update({ sort }),
		onRetry: () => void examsQuery.refetch(),
		onClear: clearAll,
		onPageChange: (page) => {
			update({ page }, { resetPage: false })
			window.requestAnimationFrame(() => {
				focusExamResultsHeading(resultsHeadingRef.current)
			})
		},
	}

	return {
		search,
		appliedSearch: state.search,
		filters,
		results,
		resultsHeadingRef,
	}
}
