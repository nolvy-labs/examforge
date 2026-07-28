"use client"

import { useCallback, useEffect, useState } from "react"

import {
	serializeExamBrowseQuery,
	updateExamBrowseState,
	type ExamBrowseState,
} from "../model/exam-browse-query"

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
			const query = serializeExamBrowseQuery(
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
	const value = draft.sourceSearch === search ? draft.value : search
	const setValue = useCallback(
		(nextValue: string) => setDraft({ sourceSearch: search, value: nextValue }),
		[search]
	)

	useEffect(() => {
		const normalizedSearch = value.trim()
		if (normalizedSearch === search) return

		const timeout = window.setTimeout(() => {
			update({ search: normalizedSearch }, { replace: true })
		}, delay)

		return () => window.clearTimeout(timeout)
	}, [delay, search, update, value])

	const submit = useCallback(() => {
		const normalizedSearch = value.trim()
		if (normalizedSearch !== search) update({ search: normalizedSearch })
	}, [search, update, value])

	return { value, setValue, submit }
}
