"use client"

import { useRef, useState } from "react"

import { Skeleton } from "@/components/shadcn/skeleton"

import { ExamManagementHeader } from "../components/exam-management-header"
import { ExamManagementResults } from "../components/exam-management-results"
import { ExamManagementToolbar } from "../components/exam-management-toolbar"
import { ExamTableSkeleton } from "../components/exam-table-skeleton"
import { QuickCreateExamDialog } from "../components/quick-create-exam-dialog"
import { useExamManagementQuery } from "../hooks/use-exam-management-query"

export function ExamManagementPage() {
	const management = useExamManagementQuery()
	const [createOpen, setCreateOpen] = useState(false)
	const createTrigger = useRef<HTMLButtonElement | null>(null)
	const state = management.query.state
	const examsQuery = management.query.exams
	const tagsQuery = management.query.tags
	const filtered = Boolean(
		state.search ||
			state.tagIds.length ||
			state.type !== null ||
			state.archive !== "active"
	)

	function openCreate(trigger: HTMLButtonElement) {
		createTrigger.current = trigger
		setCreateOpen(true)
	}

	return (
		<main className="min-w-0 flex-1 px-3 py-5 sm:px-5 lg:px-8">
			<div className="mx-auto max-w-[96rem] space-y-5">
				<ExamManagementHeader
					totalItems={examsQuery.data?.meta.totalItems}
					onCreate={openCreate}
				/>
				<ExamManagementToolbar
					state={state}
					search={management.query.search}
					tags={management.filters.tags.all}
					tagError={tagsQuery.isError}
					onRetryTags={() => void tagsQuery.refetch()}
					activeFilterCount={management.filters.activeCount}
					actions={management.filters.actions}
				/>
				<ExamManagementResults
					data={examsQuery.data}
					isInitialLoading={examsQuery.isPending && !examsQuery.data}
					isError={examsQuery.isError}
					isFetching={examsQuery.isFetching}
					isPlaceholderData={examsQuery.isPlaceholderData}
					filtered={filtered}
					pendingArchiveIds={management.archive.pendingIds}
					pendingRestoreIds={management.restore.pendingIds}
					onRetry={() => void examsQuery.refetch()}
					onClear={management.filters.actions.clearFilters}
					onCreate={openCreate}
					onArchive={management.archive.run}
					onRestore={management.restore.run}
					onPageChange={management.filters.actions.goToPage}
				/>
			</div>

			<QuickCreateExamDialog
				open={createOpen}
				activeTags={management.filters.tags.active}
				tagsUnavailable={tagsQuery.isError}
				restoreFocusTo={createTrigger.current}
				onOpenChange={setCreateOpen}
				onCreate={management.create.run}
				onRefreshTags={() => tagsQuery.refetch()}
			/>
		</main>
	)
}

export function ExamManagementPageFallback() {
	return (
		<main className="min-w-0 flex-1 px-3 py-5 sm:px-5 lg:px-8">
			<div className="mx-auto max-w-[96rem] space-y-5">
				<div className="space-y-3 border-b pb-5">
					<Skeleton className="h-7 w-64" />
					<Skeleton className="h-4 w-full max-w-xl" />
				</div>
				<Skeleton className="h-20 w-full" />
				<ExamTableSkeleton />
			</div>
		</main>
	)
}
