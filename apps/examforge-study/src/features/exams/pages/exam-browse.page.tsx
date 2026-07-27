"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { ApiError } from "@/lib/api/api.error"

import { ExamActiveFilters } from "../components/exam-active-filters"
import { ExamBrowseResults } from "../components/exam-browse-results"
import { ExamBrowseSearch } from "../components/exam-browse-search"
import { ExamFilterPanel } from "../components/exam-filters"
import {
	useStudentExamCategories,
	useStudentExamFilters,
	useStudentExams,
} from "../hooks/exam-browse.hook"
import {
	useDebouncedExamBrowseSearch,
	useExamBrowseNavigation,
} from "../hooks/exam-browse-navigation.hook"
import {
	getInvalidExamTagIds,
	isInvalidExamCategoryError,
} from "../model/exam-browse.error"
import {
	getNormalizedBrowseQuery,
	parseExamBrowseParams,
} from "../model/exam-browse.params"

export function ExamBrowsePage() {
	const pathname = usePathname()
	const router = useRouter()
	const searchParams = useSearchParams()
	const rawQuery = searchParams.toString()
	const state = useMemo(
		() => parseExamBrowseParams(new URLSearchParams(rawQuery)),
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
	const {
		searchInput,
		setSearchInput,
		applySearchImmediately,
	} = useDebouncedExamBrowseSearch(state.search, update)

	useEffect(() => {
		const normalized = getNormalizedBrowseQuery(new URLSearchParams(rawQuery))
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
		if (state.page > finalPage) {
			const signature = `page:${rawQuery}`
			if (!correctionAttempts.current.has(signature)) {
				correctionAttempts.current.add(signature)
				update({ page: finalPage }, { resetPage: false, replace: true })
			}
		}
	}, [examsQuery.data, examsQuery.isPlaceholderData, rawQuery, state.page, update])

	useEffect(() => {
		const error = examsQuery.error
		if (!(error instanceof ApiError)) return
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
	const activeFilterCount = (state.category ? 1 : 0) + state.tagIds.length
	const hasDiscoveryFilters = Boolean(
		state.search || state.category || state.tagIds.length || state.sort !== "newest"
	)
	const resultData = examsQuery.data
	const filterData = {
		categories: categoriesQuery.data,
		groups: filtersQuery.data?.groups,
		categoryError: categoriesQuery.isError,
		tagError: filtersQuery.isError,
		onRetryCategories: () => void categoriesQuery.refetch(),
		onRetryTags: () => void filtersQuery.refetch(),
	}

	function clearAll() {
		setSearchInput("")
		navigate({
			search: "",
			category: "",
			tagIds: [],
			sort: "newest",
			page: 1,
		})
	}

	return (
		<main className="flex-1 bg-slate-50">
			<section className="border-b bg-white">
				<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
					<div className="max-w-3xl">
						<h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
							Browse Exams
						</h1>
						<p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">
							Find a published exam by title, category, or learning topic.
						</p>
					</div>
					<ExamBrowseSearch
						value={searchInput}
						onChange={setSearchInput}
						onSubmit={applySearchImmediately}
					/>
				</div>
			</section>

			<div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:px-8">
				<aside className="hidden lg:block">
					<div className="sticky top-6 rounded-xl border border-slate-200 bg-white p-5">
						<ExamFilterPanel
							data={filterData}
							category={state.category}
							tagIds={state.tagIds}
							onCategoryChange={(category) => update({ category })}
							onTagChange={(id, checked) =>
								update({
									tagIds: checked
										? Array.from(new Set([...state.tagIds, id])).sort()
										: state.tagIds.filter((tagId) => tagId !== id),
								})
							}
							onClear={() => update({ category: "", tagIds: [] })}
						/>
					</div>
				</aside>

				<section className="min-w-0 space-y-6" aria-labelledby="exam-results-heading">
					<ExamBrowseResults
						headingRef={resultsHeadingRef}
						activeFilters={
							<ExamActiveFilters
								search={state.search}
								categoryName={
									state.category
										? categoryBySlug.get(state.category)?.name
										: undefined
								}
								tags={activeTags}
								onClearSearch={() => {
									setSearchInput("")
									update({ search: "" })
								}}
								onClearCategory={() => update({ category: "" })}
								onRemoveTag={(id) =>
									update({
										tagIds: state.tagIds.filter((tagId) => tagId !== id),
									})
								}
								onClearAll={clearAll}
							/>
						}
						data={resultData}
						filterData={filterData}
						category={state.category}
						tagIds={state.tagIds}
						activeFilterCount={activeFilterCount}
						sort={state.sort}
						isInitialLoading={examsQuery.isPending && !resultData}
						isError={examsQuery.isError}
						isFetching={examsQuery.isFetching}
						isPlaceholderData={examsQuery.isPlaceholderData}
						hasDiscoveryFilters={hasDiscoveryFilters}
						onApplyFilters={(category, tagIds) => update({ category, tagIds })}
						onSortChange={(sort) => update({ sort })}
						onRetry={() => void examsQuery.refetch()}
						onClear={clearAll}
						onPageChange={(page) => {
							update({ page }, { resetPage: false })
							window.requestAnimationFrame(() => {
								resultsHeadingRef.current?.focus({ preventScroll: true })
								resultsHeadingRef.current?.scrollIntoView({
									behavior: "smooth",
									block: "start",
								})
							})
						}}
					/>
				</section>
			</div>
		</main>
	)
}
