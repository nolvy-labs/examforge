"use client"

import { Fragment, type RefObject } from "react"

import type {
	ExamBrowseFiltersViewModel,
	ExamBrowseResultsViewModel,
} from "../hooks/use-exam-browse-query"
import { ExamActiveFilters } from "./exam-active-filters"
import { ExamPagination } from "./exam-pagination"
import { ExamResultsHeader } from "./exam-results-header"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/shadcn/card"
import { Skeleton } from "@/components/shadcn/skeleton"
import { StudentExam } from "../../types/exam.types"
import { cn } from "@/lib/utils"
import ExamCard from "../../components/exam-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { LocaleMessage } from "@/components/locale/locale-message"

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

			{results.isInitialLoading || results.isFetching ? (
				<ExamGridSkeleton />
			) : results.isError ? (
				<ExamResultsError onRetry={results.onRetry} />
			) : results.data?.items.length ? (
				<Fragment>
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
				</Fragment>
			) : (
				<ExamResultsEmpty
					hasDiscoveryFilters={results.hasDiscoveryFilters}
					onClear={results.onClear}
				/>
			)}
		</section>
	)
}

function ExamGridSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
			{Array.from({ length: 6 }, (_, index) => (
				<Card key={index}>
					<CardHeader>
						<Skeleton className="h-5 w-24" />
						<Skeleton className="h-6 w-4/5" />
						<Skeleton className="h-6 w-2/3" />
					</CardHeader>
					<CardContent className="space-y-2">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-5/6" />
					</CardContent>
					<CardFooter>
						<Skeleton className="h-9 w-full" />
					</CardFooter>
				</Card>
			))}
		</div>
	)
}

interface ExamResultsGridProps {
	exams: StudentExam[]
	isPlaceholderData: boolean
}

function ExamResultsGrid({ exams, isPlaceholderData }: ExamResultsGridProps) {
	return (
		<div
			className={cn(
				"grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3",
				isPlaceholderData && "opacity-60"
			)}
		>
			{exams.map((exam) => (
				<ExamCard key={exam.id} exam={exam} />
			))}
		</div>
	)
}

interface ExamResultsErrorProps {
	onRetry: () => void
}

export function ExamResultsError({ onRetry }: ExamResultsErrorProps) {
	return (
		<Alert>
			<AlertTitle><LocaleMessage messageId="exams.loadErrorTitle" /></AlertTitle>
			<AlertDescription>
				<p><LocaleMessage messageId="exams.loadErrorDescription" /></p>
				<Button type="button" className="mt-4" onClick={onRetry}>
					<LocaleMessage messageId="common.retry" />
				</Button>
			</AlertDescription>
		</Alert>
	)
}

interface ExamResultsEmptyProps {
	hasDiscoveryFilters: boolean
	onClear: () => void
}

export function ExamResultsEmpty({ hasDiscoveryFilters, onClear }: ExamResultsEmptyProps) {
	return (
		<Card>
			<CardContent className="px-6 py-16 text-center">
				<h3 className="text-lg font-semibold">
					<LocaleMessage messageId={hasDiscoveryFilters ? "exams.emptyFilteredTitle" : "exams.emptyAvailableTitle"} />
				</h3>
				<p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
					<LocaleMessage messageId={hasDiscoveryFilters ? "exams.emptyFilteredDescription" : "exams.emptyAvailableDescription"} />
				</p>
				{hasDiscoveryFilters && (
					<Button type="button" className="mt-5" onClick={onClear}>
						<LocaleMessage messageId="exams.clearFilters" />
					</Button>
				)}
			</CardContent>
		</Card>
	)
}