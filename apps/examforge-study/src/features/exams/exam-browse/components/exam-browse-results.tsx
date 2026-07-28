"use client"

import type { RefObject } from "react"
import { LoaderCircle } from "lucide-react"

import type {
	ExamBrowseFiltersViewModel,
	ExamBrowseResultsViewModel,
} from "../hooks/use-exam-browse-query"
import { ExamActiveFilters } from "./exam-active-filters"
import { ExamGridSkeleton } from "./exam-grid-skeleton"
import { ExamPagination } from "./exam-pagination"
import { ExamResultsEmpty } from "./exam-results-empty"
import { ExamResultsError } from "./exam-results-error"
import { ExamResultsGrid } from "./exam-results-grid"
import { ExamResultsHeader } from "./exam-results-header"

interface Props {
	headingRef: RefObject<HTMLHeadingElement | null>
	search: string
	filters: ExamBrowseFiltersViewModel
	results: ExamBrowseResultsViewModel
}

export function ExamBrowseResults({
	headingRef,
	search,
	filters,
	results,
}: Props) {
	return (
		<section className="min-w-0 space-y-6">
			<ExamResultsHeader
				headingRef={headingRef}
				filters={filters}
				results={results}
			/>
			<ExamActiveFilters search={search} filters={filters} />

			{results.isFetching && results.data && (
				<div
					role="status"
					className="flex items-center gap-2 text-sm text-muted-foreground"
				>
					<LoaderCircle
						className="size-4 animate-spin motion-reduce:animate-none"
					/>
					Updating results…
				</div>
			)}

			{results.isInitialLoading ? (
				<ExamGridSkeleton />
			) : results.isError ? (
				<ExamResultsError onRetry={results.onRetry} />
			) : results.data?.items.length ? (
				<>
					<ExamResultsGrid
						exams={results.data.items}
						isPlaceholderData={results.isPlaceholderData}
					/>
					<ExamPagination
						page={results.data.meta.page}
						totalPages={results.data.meta.totalPages}
						hasPreviousPage={results.data.meta.hasPreviousPage}
						hasNextPage={results.data.meta.hasNextPage}
						onPageChange={results.onPageChange}
					/>
				</>
			) : (
				<ExamResultsEmpty
					hasDiscoveryFilters={results.hasDiscoveryFilters}
					onClear={results.onClear}
				/>
			)}
		</section>
	)
}
