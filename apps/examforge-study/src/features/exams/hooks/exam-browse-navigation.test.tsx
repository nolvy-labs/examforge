import { act, renderHook } from "@testing-library/react"
import { useCallback, useRef, useState } from "react"
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest"

import {
	parseExamBrowseParams,
	serializeExamBrowseState,
} from "../model/exam-browse.params"
import type { ExamBrowseState } from "../model/exam-browse.types"
import {
	useDebouncedExamBrowseSearch,
	useExamBrowseNavigation,
} from "./exam-browse-navigation.hook"

const EMPTY_STATE: ExamBrowseState = {
	search: "",
	category: "",
	tagIds: [],
	sort: "newest",
	page: 1,
}

interface NavigationRecord {
	href: string
	replace: boolean
}

function stateFromHref(href: string) {
	const url = new URL(href, "https://examforge.test")
	return parseExamBrowseParams(url.searchParams)
}

function useBrowseHarness(initialState: ExamBrowseState = EMPTY_STATE) {
	const [state, setState] = useState(initialState)
	const navigationRecords = useRef<NavigationRecord[]>([])
	const rawQuery = serializeExamBrowseState(state).toString()
	const onNavigate = useCallback((href: string, replace: boolean) => {
		navigationRecords.current.push({ href, replace })
		setState(stateFromHref(href))
	}, [])
	const navigation = useExamBrowseNavigation({
		pathname: "/exams",
		rawQuery,
		state,
		onNavigate,
	})
	const search = useDebouncedExamBrowseSearch(state.search, navigation.update)

	return { state, navigation, search, navigationRecords }
}

describe("exam browse navigation", () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("preserves a tag selected while search is pending", () => {
		const { result } = renderHook(() => useBrowseHarness())

		act(() => result.current.search.setSearchInput("algebra"))
		act(() => result.current.navigation.update({ tagIds: ["tag-1"] }))
		act(() => vi.advanceTimersByTime(400))

		expect(result.current.state).toMatchObject({
			search: "algebra",
			tagIds: ["tag-1"],
		})
	})

	it("preserves a category selected while search is pending", () => {
		const { result } = renderHook(() => useBrowseHarness())

		act(() => result.current.search.setSearchInput("algebra"))
		act(() => result.current.navigation.update({ category: "mathematics" }))
		act(() => vi.advanceTimersByTime(400))

		expect(result.current.state).toMatchObject({
			search: "algebra",
			category: "mathematics",
		})
	})

	it("preserves a sort change made while search is pending", () => {
		const { result } = renderHook(() => useBrowseHarness())

		act(() => result.current.search.setSearchInput("algebra"))
		act(() => result.current.navigation.update({ sort: "oldest" }))
		act(() => vi.advanceTimersByTime(400))

		expect(result.current.state).toMatchObject({
			search: "algebra",
			sort: "oldest",
		})
	})

	it("preserves a page selected while search is pending", () => {
		const { result } = renderHook(() => useBrowseHarness())

		act(() => result.current.search.setSearchInput("algebra"))
		act(() =>
			result.current.navigation.update(
				{ page: 4 },
				{ resetPage: false }
			)
		)
		act(() => vi.advanceTimersByTime(400))

		expect(result.current.state).toMatchObject({
			search: "algebra",
			page: 4,
		})
	})

	it("applies only the final trimmed value during rapid typing", () => {
		const { result } = renderHook(() => useBrowseHarness())

		act(() => result.current.search.setSearchInput(" alg"))
		act(() => vi.advanceTimersByTime(200))
		act(() => result.current.search.setSearchInput(" algebra  "))
		act(() => vi.advanceTimersByTime(400))

		expect(result.current.state.search).toBe("algebra")
		expect(result.current.navigationRecords.current).toEqual([
			{ href: "/exams?q=algebra", replace: true },
		])
	})

	it("clears only search and preserves unrelated filters", () => {
		const initialState: ExamBrowseState = {
			search: "algebra",
			category: "mathematics",
			tagIds: ["tag-1"],
			sort: "oldest",
			page: 3,
		}
		const { result } = renderHook(() => useBrowseHarness(initialState))

		act(() => result.current.search.setSearchInput("   "))
		act(() => vi.advanceTimersByTime(400))

		expect(result.current.state).toEqual({
			search: "",
			category: "mathematics",
			tagIds: ["tag-1"],
			sort: "oldest",
			page: 3,
		})
	})

	it("cancels and recreates a pending timeout when URL state changes", () => {
		const { result } = renderHook(() => useBrowseHarness())

		act(() => result.current.search.setSearchInput("algebra"))
		act(() => vi.advanceTimersByTime(200))
		act(() => result.current.navigation.update({ category: "mathematics" }))
		act(() => vi.advanceTimersByTime(200))

		expect(result.current.state.search).toBe("")

		act(() => vi.advanceTimersByTime(200))

		expect(result.current.state).toMatchObject({
			search: "algebra",
			category: "mathematics",
		})
	})

	it("cancels a pending timeout on unmount", () => {
		const { result, unmount } = renderHook(() => useBrowseHarness())

		act(() => result.current.search.setSearchInput("algebra"))
		unmount()
		act(() => vi.runAllTimers())

		expect(result.current.navigationRecords.current).toEqual([])
	})
})
