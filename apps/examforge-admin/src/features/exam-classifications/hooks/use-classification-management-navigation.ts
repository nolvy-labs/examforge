"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type {
	AssignableExamCategoryMatchMode,
	AssignableExamTagType,
} from "@/features/exam-classifications/types/exam-classification.types"

import {
	getDefaultClassificationState,
	getNormalizedClassificationManagementQuery,
	parseClassificationManagementQuery,
	serializeClassificationManagementQuery,
	updateClassificationManagementState,
	type CategoryFeaturedFilter,
	type CategorySort,
	type ClassificationArchiveFilter,
	type ClassificationManagementState,
	type ClassificationTab,
	type TagSort,
} from "../model/classification-management-query"

export function useClassificationManagementNavigation(searchDelay = 400) {
	const pathname = usePathname()
	const router = useRouter()
	const searchParams = useSearchParams()
	const rawQuery = searchParams.toString()
	const state = useMemo(
		() => parseClassificationManagementQuery(new URLSearchParams(rawQuery)),
		[rawQuery]
	)
	const [searchDraft, setSearchDraft] = useState({
		sourceSearch: state.search,
		value: state.search,
	})
	const searchValue =
		searchDraft.sourceSearch === state.search
			? searchDraft.value
			: state.search

	const navigate = useCallback(
		(next: ClassificationManagementState, replace = false) => {
			const query = serializeClassificationManagementQuery(
				next,
				new URLSearchParams(rawQuery)
			).toString()
			if (query === rawQuery) return
			const href = query ? `${pathname}?${query}` : pathname
			if (replace) router.replace(href, { scroll: false })
			else router.push(href, { scroll: false })
		},
		[pathname, rawQuery, router]
	)

	const update = useCallback(
		(patch: Record<string, unknown>, replace = false) => {
			navigate(updateClassificationManagementState(state, patch), replace)
		},
		[navigate, state]
	)

	useEffect(() => {
		const normalized = getNormalizedClassificationManagementQuery(
			new URLSearchParams(rawQuery)
		)
		if (normalized === rawQuery) return
		router.replace(normalized ? `${pathname}?${normalized}` : pathname, {
			scroll: false,
		})
	}, [pathname, rawQuery, router])

	useEffect(() => {
		const normalizedSearch = searchValue.trim()
		if (normalizedSearch === state.search) return
		const timeout = window.setTimeout(
			() => update({ search: normalizedSearch }, true),
			searchDelay
		)
		return () => window.clearTimeout(timeout)
	}, [searchDelay, searchValue, state.search, update])

	const setSearch = useCallback(
		(value: string) =>
			setSearchDraft({ sourceSearch: state.search, value }),
		[state.search]
	)
	const setTab = useCallback(
		(tab: ClassificationTab) => navigate(getDefaultClassificationState(tab)),
		[navigate]
	)
	const clearFilters = useCallback(() => {
		setSearchDraft({ sourceSearch: state.search, value: "" })
		navigate(getDefaultClassificationState(state.tab))
	}, [navigate, state.search, state.tab])

	return {
		state,
		search: { value: searchValue, setValue: setSearch },
		actions: {
			setTab,
			setArchive: (archive: ClassificationArchiveFilter) =>
				update({ archive }),
			setTagType: (type: AssignableExamTagType | null) =>
				update({ type }),
			setTagSort: (sort: TagSort) => update({ sort }),
			setMatchMode: (matchMode: AssignableExamCategoryMatchMode | null) =>
				update({ matchMode }),
			setFeatured: (featured: CategoryFeaturedFilter) =>
				update({ featured }),
			setCategorySort: (sort: CategorySort) => update({ sort }),
			clearFilters,
		},
	}
}
