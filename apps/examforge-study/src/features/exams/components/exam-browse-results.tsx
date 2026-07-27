"use client"

import type { ReactNode, RefObject } from "react"
import { LoaderCircle } from "lucide-react"

import { Button } from "@/components/shadcn/button"

import { ExamFilterDrawer, type ExamFilterData } from "./exam-filters"
import {
	ExamCard,
	ExamGridSkeleton,
	ExamPagination,
} from "./exam-results"
import type {
	ExamBrowseSort,
	StudentExamPage,
} from "../model/exam-browse.types"

export function ExamBrowseResults({
	headingRef,
	activeFilters,
	data,
	filterData,
	category,
	tagIds,
	activeFilterCount,
	sort,
	isInitialLoading,
	isError,
	isFetching,
	isPlaceholderData,
	hasDiscoveryFilters,
	onApplyFilters,
	onSortChange,
	onRetry,
	onClear,
	onPageChange,
}: {
	headingRef: RefObject<HTMLHeadingElement | null>
	activeFilters: ReactNode
	data?: StudentExamPage
	filterData: ExamFilterData
	category: string
	tagIds: string[]
	activeFilterCount: number
	sort: ExamBrowseSort
	isInitialLoading: boolean
	isError: boolean
	isFetching: boolean
	isPlaceholderData: boolean
	hasDiscoveryFilters: boolean
	onApplyFilters: (category: string, tagIds: string[]) => void
	onSortChange: (sort: ExamBrowseSort) => void
	onRetry: () => void
	onClear: () => void
	onPageChange: (page: number) => void
}) {
	return (
		<>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2
						id="exam-results-heading"
						ref={headingRef}
						tabIndex={-1}
						className="text-xl font-semibold text-slate-950 outline-none"
					>
						Available exams
					</h2>
					{data && (
						<p className="mt-1 text-sm text-slate-600" aria-live="polite">
							{data.meta.totalItems}{" "}
							{data.meta.totalItems === 1 ? "exam" : "exams"}
						</p>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<ExamFilterDrawer
						data={filterData}
						category={category}
						tagIds={tagIds}
						activeCount={activeFilterCount}
						onApply={onApplyFilters}
					/>
					<label htmlFor="exam-sort" className="sr-only">
						Sort exams
					</label>
					<select
						id="exam-sort"
						value={sort}
						onChange={(event) =>
							onSortChange(event.target.value === "oldest" ? "oldest" : "newest")
						}
						className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
					>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>
			</div>

			{activeFilters}

			{isFetching && data && (
				<div role="status" className="flex items-center gap-2 text-sm text-slate-500">
					<LoaderCircle
						className="size-4 animate-spin motion-reduce:animate-none"
						aria-hidden="true"
					/>
					Updating results…
				</div>
			)}

			{isInitialLoading ? (
				<ExamGridSkeleton />
			) : isError ? (
				<StateMessage
					title="We couldn't load the exams"
					description="The exam service is unavailable right now. Your filters have been preserved."
					actionLabel="Try again"
					onAction={onRetry}
				/>
			) : data?.items.length ? (
				<>
					<div
						className={`grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 ${
							isPlaceholderData ? "opacity-60" : ""
						}`}
					>
						{data.items.map((exam) => (
							<ExamCard key={exam.id} exam={exam} />
						))}
					</div>
					<ExamPagination
						page={data.meta.page}
						totalPages={data.meta.totalPages}
						hasPreviousPage={data.meta.hasPreviousPage}
						hasNextPage={data.meta.hasNextPage}
						onPageChange={onPageChange}
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
					onAction={hasDiscoveryFilters ? onClear : undefined}
				/>
			)}
		</>
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
