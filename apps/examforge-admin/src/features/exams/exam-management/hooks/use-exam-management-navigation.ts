"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { EXAM_SEARCH_MAX_LENGTH } from "../../types/exam.schema"
import type {
	ExamArchiveFilter,
	ExamSortOrder,
	ExamType,
} from "../../types/exam.types"
import {
	getNormalizedExamManagementQuery,
	parseExamManagementQuery,
	serializeExamManagementQuery,
	updateExamManagementState,
	type ExamManagementQueryState,
} from "../model/exam-management-query"

interface UpdateOptions {
	resetPage?: boolean
	replace?: boolean
}

function normalizeTagIds(tagIds: string[]) {
	return Array.from(
		new Set(tagIds.map((tagId) => tagId.trim().toLowerCase()))
	).sort()
}

export function useExamManagementNavigation(searchDelay = 400) {
	const pathname = usePathname()
	const router = useRouter()
	const searchParams = useSearchParams()
	const rawQuery = searchParams.toString()
	const state = useMemo(
		() => parseExamManagementQuery(new URLSearchParams(rawQuery)),
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
		(nextState: ExamManagementQueryState, replace = false) => {
			const query = serializeExamManagementQuery(
				nextState,
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
		(patch: Partial<ExamManagementQueryState>, options?: UpdateOptions) => {
			navigate(
				updateExamManagementState(
					state,
					patch,
					options?.resetPage ?? true
				),
				options?.replace
			)
		},
		[navigate, state]
	)

	useEffect(() => {
		const normalized = getNormalizedExamManagementQuery(
			new URLSearchParams(rawQuery)
		)
		if (normalized === rawQuery) return

		router.replace(normalized ? `${pathname}?${normalized}` : pathname, {
			scroll: false,
		})
	}, [pathname, rawQuery, router])

	useEffect(() => {
		const normalizedSearch = searchValue
			.trim()
			.slice(0, EXAM_SEARCH_MAX_LENGTH)
		if (normalizedSearch === state.search) return

		const timeout = window.setTimeout(() => {
			update({ search: normalizedSearch }, { replace: true })
		}, searchDelay)

		return () => window.clearTimeout(timeout)
	}, [searchDelay, searchValue, state.search, update])

	const setSearchValue = useCallback(
		(value: string) => {
			setSearchDraft({
				sourceSearch: state.search,
				value: value.slice(0, EXAM_SEARCH_MAX_LENGTH),
			})
		},
		[state.search]
	)

	const clearFilters = useCallback(() => {
		setSearchDraft({ sourceSearch: state.search, value: "" })
		navigate({
			search: "",
			tagIds: [],
			type: null,
			archive: "active",
			sort: "newest",
			page: 1,
		})
	}, [navigate, state.search])
	const setTagIds = useCallback(
		(tagIds: string[]) => update({ tagIds: normalizeTagIds(tagIds) }),
		[update]
	)
	const setType = useCallback(
		(type: ExamType | null) => update({ type }),
		[update]
	)
	const setArchive = useCallback(
		(archive: ExamArchiveFilter) => update({ archive }),
		[update]
	)
	const setSort = useCallback(
		(sort: ExamSortOrder) => update({ sort }),
		[update]
	)
	const goToPage = useCallback(
		(page: number) => update({ page }, { resetPage: false }),
		[update]
	)
	const correctPage = useCallback(
		(page: number) =>
			update({ page }, { resetPage: false, replace: true }),
		[update]
	)
	const actions = useMemo(
		() => ({
			setTagIds,
			setType,
			setArchive,
			setSort,
			goToPage,
			correctPage,
			clearFilters,
		}),
		[
			clearFilters,
			correctPage,
			goToPage,
			setArchive,
			setSort,
			setTagIds,
			setType,
		]
	)

	return {
		state,
		search: {
			value: searchValue,
			setValue: setSearchValue,
		},
		actions,
	}
}
