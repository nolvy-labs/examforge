"use client"

import { useCallback, useEffect, useState } from "react"

import {
	serializeExamBrowseState,
	updateExamBrowseState,
} from "../model/exam-browse.params"
import type { ExamBrowseState } from "../model/exam-browse.types"

interface ExamBrowseNavigationOptions {
	pathname: string
	rawQuery: string
	state: ExamBrowseState
	onNavigate: (href: string, replace: boolean) => void
}

interface ExamBrowseUpdateOptions {
	resetPage?: boolean
	replace?: boolean
}

export function useExamBrowseNavigation({
	pathname,
	rawQuery,
	state,
	onNavigate,
}: ExamBrowseNavigationOptions) {
	const navigate = useCallback(
		(nextState: ExamBrowseState, replace = false) => {
			const query = serializeExamBrowseState(
				nextState,
				new URLSearchParams(rawQuery)
			).toString()
			onNavigate(query ? `${pathname}?${query}` : pathname, replace)
		},
		[onNavigate, pathname, rawQuery]
	)

	const update = useCallback(
		(
			patch: Partial<ExamBrowseState>,
			options?: ExamBrowseUpdateOptions
		) => {
			navigate(
				updateExamBrowseState(state, patch, options?.resetPage ?? true),
				options?.replace
			)
		},
		[navigate, state]
	)

	return { navigate, update }
}

export function useDebouncedExamBrowseSearch(
	search: string,
	update: ReturnType<typeof useExamBrowseNavigation>["update"],
	delay = 400
) {
	const [draft, setDraft] = useState({ sourceSearch: search, value: search })
	const searchInput = draft.sourceSearch === search ? draft.value : search
	const setSearchInput = useCallback(
		(value: string) => setDraft({ sourceSearch: search, value }),
		[search]
	)

	useEffect(() => {
		const normalizedSearch = searchInput.trim()
		if (normalizedSearch === search) return

		const timeout = window.setTimeout(() => {
			update(
				{ search: normalizedSearch },
				{ resetPage: false, replace: true }
			)
		}, delay)

		return () => window.clearTimeout(timeout)
	}, [delay, search, searchInput, update])

	const applySearchImmediately = useCallback(() => {
		const normalizedSearch = searchInput.trim()
		if (normalizedSearch !== search) {
			update({ search: normalizedSearch }, { resetPage: false })
		}
	}, [search, searchInput, update])

	return {
		searchInput,
		setSearchInput,
		applySearchImmediately,
	}
}
