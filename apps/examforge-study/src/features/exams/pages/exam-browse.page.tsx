"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { LoaderCircle, Search, X } from "lucide-react"

import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import { ApiError } from "@/lib/api/api.error"

import {
	ExamFilterDrawer,
	ExamFilterPanel,
} from "../components/exam-filters"
import {
	ExamCard,
	ExamGridSkeleton,
	ExamPagination,
} from "../components/exam-results"
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

	const onNavigate = useCallback((href: string, replace: boolean) => {
		if (replace) router.replace(href, { scroll: false })
		else router.push(href, { scroll: false })
	}, [router])
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

		const invalidTagIds = getInvalidTagIds(error)
		if (invalidTagIds.length) {
			const invalid = new Set(invalidTagIds.map((id) => id.toLowerCase()))
			const remaining = state.tagIds.filter((id) => !invalid.has(id))
			if (remaining.length !== state.tagIds.length) {
				correctionAttempts.current.add(signature)
				update({ tagIds: remaining }, { replace: true })
				return
			}
		}

		const detail = error.problem?.detail
		if (
			state.category &&
			error.status === 404 &&
			typeof detail === "string" &&
			detail.toLowerCase().includes("category")
		) {
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
	const activeFilterCount =
		(state.category ? 1 : 0) + state.tagIds.length
	const hasDiscoveryFilters = Boolean(
		state.search || state.category || state.tagIds.length || state.sort !== "newest"
	)
	const resultData = examsQuery.data
	const isInitialLoading = examsQuery.isPending && !resultData

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

	const filterPanelProps = {
		categories: categoriesQuery.data,
		groups: filtersQuery.data?.groups,
		categoryError: categoriesQuery.isError,
		tagError: filtersQuery.isError,
		onRetryCategories: () => void categoriesQuery.refetch(),
		onRetryTags: () => void filtersQuery.refetch(),
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
					<form
						role="search"
						className="relative mt-7 max-w-3xl"
						onSubmit={(event) => {
							event.preventDefault()
							applySearchImmediately()
						}}
					>
						<label htmlFor="exam-search" className="sr-only">
							Search exam titles
						</label>
						<Search
							className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
							aria-hidden="true"
						/>
						<Input
							id="exam-search"
							type="search"
							value={searchInput}
							onChange={(event) => setSearchInput(event.target.value)}
							placeholder="Search exam titles…"
							className="h-12 rounded-xl bg-white pl-12 pr-4 text-base"
						/>
					</form>
				</div>
			</section>

			<div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:px-8">
				<aside className="hidden lg:block">
					<div className="sticky top-6 rounded-xl border border-slate-200 bg-white p-5">
						<ExamFilterPanel
							{...filterPanelProps}
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
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2
								id="exam-results-heading"
								ref={resultsHeadingRef}
								tabIndex={-1}
								className="text-xl font-semibold text-slate-950 outline-none"
							>
								Available exams
							</h2>
							{resultData && (
								<p className="mt-1 text-sm text-slate-600" aria-live="polite">
									{resultData.meta.totalItems}{" "}
									{resultData.meta.totalItems === 1 ? "exam" : "exams"}
								</p>
							)}
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<ExamFilterDrawer
								{...filterPanelProps}
								category={state.category}
								tagIds={state.tagIds}
								activeCount={activeFilterCount}
								onCategoryChange={() => undefined}
								onTagChange={() => undefined}
								onClear={() => undefined}
								onApply={(category, tagIds) => update({ category, tagIds })}
							/>
							<label htmlFor="exam-sort" className="sr-only">
								Sort exams
							</label>
							<select
								id="exam-sort"
								value={state.sort}
								onChange={(event) =>
									update({
										sort: event.target.value === "oldest" ? "oldest" : "newest",
									})
								}
								className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
							>
								<option value="newest">Newest</option>
								<option value="oldest">Oldest</option>
							</select>
						</div>
					</div>

					{(state.search || state.category || state.tagIds.length > 0) && (
						<div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
							{state.search && (
								<FilterChip
									label={`Title: ${state.search}`}
									onRemove={() => {
										setSearchInput("")
										update({ search: "" })
									}}
								/>
							)}
							{state.category && categoryBySlug.has(state.category) && (
								<FilterChip
									label={categoryBySlug.get(state.category)!.name}
									onRemove={() => update({ category: "" })}
								/>
							)}
							{state.tagIds.map((id) => {
								const tag = tagById.get(id)
								return tag ? (
									<FilterChip
										key={id}
										label={tag.name}
										onRemove={() =>
											update({
												tagIds: state.tagIds.filter((tagId) => tagId !== id),
											})
										}
									/>
								) : null
							})}
							<Button type="button" variant="link" size="sm" onClick={clearAll}>
								Clear all
							</Button>
						</div>
					)}

					{examsQuery.isFetching && resultData && (
						<div
							role="status"
							className="flex items-center gap-2 text-sm text-slate-500"
						>
							<LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
							Updating results…
						</div>
					)}

					{isInitialLoading ? (
						<ExamGridSkeleton />
					) : examsQuery.isError ? (
						<StateMessage
							title="We couldn't load the exams"
							description="The exam service is unavailable right now. Your filters have been preserved."
							actionLabel="Try again"
							onAction={() => void examsQuery.refetch()}
						/>
					) : resultData?.items.length ? (
						<>
							<div
								className={`grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 ${
									examsQuery.isPlaceholderData ? "opacity-60" : ""
								}`}
							>
								{resultData.items.map((exam) => (
									<ExamCard key={exam.id} exam={exam} />
								))}
							</div>
							<ExamPagination
								page={resultData.meta.page}
								totalPages={resultData.meta.totalPages}
								hasPreviousPage={resultData.meta.hasPreviousPage}
								hasNextPage={resultData.meta.hasNextPage}
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
						</>
					) : (
						<StateMessage
							title={hasDiscoveryFilters ? "No exams match these filters" : "No exams are available yet"}
							description={
								hasDiscoveryFilters
									? "Try a different title or remove some filters."
									: "Published exams will appear here when they become available."
							}
							actionLabel={hasDiscoveryFilters ? "Clear filters" : undefined}
							onAction={hasDiscoveryFilters ? clearAll : undefined}
						/>
					)}
				</section>
			</div>
		</main>
	)
}

function getInvalidTagIds(error: ApiError) {
	const value = error.problem?.invalidTagIds
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: []
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
	return (
		<span className="inline-flex max-w-full items-center gap-1 rounded-full bg-indigo-50 py-1 pl-3 pr-1 text-sm text-indigo-800">
			<span className="truncate">{label}</span>
			<button
				type="button"
				aria-label={`Remove ${label} filter`}
				className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
				onClick={onRemove}
			>
				<X className="size-3.5" aria-hidden="true" />
			</button>
		</span>
	)
}

function StateMessage({
	title,
	description,
	actionLabel,
	onAction,
}: {
	title: string
	description: string
	actionLabel?: string
	onAction?: () => void
}) {
	return (
		<div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
			<h3 className="text-lg font-semibold text-slate-950">{title}</h3>
			<p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
				{description}
			</p>
			{actionLabel && onAction && (
				<Button type="button" className="mt-5" onClick={onAction}>
					{actionLabel}
				</Button>
			)}
		</div>
	)
}
