"use client"

import { ArrowClockwiseIcon, SpinnerGapIcon, WarningIcon } from "@phosphor-icons/react"

import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"

import type { AdminExamListResponse } from "../../types/exam.types"
import { ExamManagementEmpty } from "./exam-management-empty"
import { ExamManagementError } from "./exam-management-error"
import { ExamPagination } from "./exam-pagination"
import { ExamTable } from "./exam-table"
import { ExamTableSkeleton } from "./exam-table-skeleton"

interface Props {
	data?: AdminExamListResponse
	isInitialLoading: boolean
	isError: boolean
	isFetching: boolean
	isPlaceholderData: boolean
	filtered: boolean
	pendingArchiveIds: ReadonlySet<string>
	pendingRestoreIds: ReadonlySet<string>
	onRetry: () => void
	onClear: () => void
	onCreate: (trigger: HTMLButtonElement) => void
	onArchive: (id: string) => Promise<void>
	onRestore: (id: string) => Promise<void>
	onPageChange: (page: number) => void
	onOpenDetails: (exam: AdminExamListResponse["items"][number]) => void
	onOpenVersions: (exam: AdminExamListResponse["items"][number]) => void
}

export function ExamManagementResults({
	data,
	isInitialLoading,
	isError,
	isFetching,
	isPlaceholderData,
	filtered,
	pendingArchiveIds,
	pendingRestoreIds,
	onRetry,
	onClear,
	onCreate,
	onArchive,
	onRestore,
	onPageChange,
	onOpenDetails,
	onOpenVersions,
}: Props) {
	if (isInitialLoading) return <ExamTableSkeleton />
	if (isError && !data) return <ExamManagementError onRetry={onRetry} />

	return (
		<section className="space-y-3" aria-labelledby="exam-results-heading">
			<div className="flex min-h-7 items-center justify-between gap-3">
				<h2 id="exam-results-heading" className="text-sm font-medium">
					Exam results
				</h2>
				{isFetching && data && (
					<p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
						<SpinnerGapIcon className="animate-spin" />
						Updating results…
					</p>
				)}
			</div>

			{isError && data && (
				<Alert>
					<WarningIcon />
					<AlertTitle>Updated results could not be loaded</AlertTitle>
					<AlertDescription className="flex items-center justify-between gap-3">
						<span>The last successful results remain visible.</span>
						<Button type="button" variant="outline" size="sm" onClick={onRetry}>
							<ArrowClockwiseIcon /> Retry
						</Button>
					</AlertDescription>
				</Alert>
			)}

			{data?.items.length ? (
				<div>
					<ExamTable
						exams={data.items}
						isPlaceholderData={isPlaceholderData}
						pendingArchiveIds={pendingArchiveIds}
						pendingRestoreIds={pendingRestoreIds}
						onArchive={onArchive}
						onRestore={onRestore}
						onRefresh={onRetry}
						onOpenDetails={onOpenDetails}
						onOpenVersions={onOpenVersions}
					/>
					<ExamPagination
						page={data.meta.page}
						totalPages={data.meta.totalPages}
						hasPreviousPage={data.meta.hasPreviousPage}
						hasNextPage={data.meta.hasNextPage}
						onPageChange={onPageChange}
					/>
				</div>
			) : (
				<ExamManagementEmpty filtered={filtered} onClear={onClear} onCreate={onCreate} />
			)}
		</section>
	)
}
