"use client"

import { ArrowClockwiseIcon, FunnelIcon, XIcon } from "@phosphor-icons/react"

import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from "@/components/shadcn/alert"
import { Badge } from "@/components/shadcn/badge"
import { Button } from "@/components/shadcn/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/shadcn/select"
import type { AdminExamTag } from "@/features/exam-classifications/types/exam-classification.types"

import type { ExamManagementQueryState } from "../model/exam-management-query"
import type {
	ExamArchiveFilter,
	ExamSortOrder,
	ExamType,
} from "../../types/exam.types"
import { ExamManagementSearch } from "./exam-management-search"
import { ExamTagMultiSelect } from "./exam-tag-multi-select"

interface FilterActions {
	setTagIds: (tagIds: string[]) => void
	setType: (type: ExamType | null) => void
	setArchive: (archive: ExamArchiveFilter) => void
	setSort: (sort: ExamSortOrder) => void
	clearFilters: () => void
}

interface Props {
	state: ExamManagementQueryState
	search: {
		value: string
		setValue: (value: string) => void
	}
	tags: AdminExamTag[]
	tagError: boolean
	onRetryTags: () => void
	activeFilterCount: number
	actions: FilterActions
}

export function ExamManagementToolbar({
	state,
	search,
	tags,
	tagError,
	onRetryTags,
	activeFilterCount,
	actions,
}: Props) {
	const hasChanges = Boolean(
		state.search ||
			state.tagIds.length ||
			state.type !== null ||
			state.archive !== "active" ||
			state.sort !== "newest"
	)

	return (
		<section className="space-y-3" aria-labelledby="exam-filters-heading">
			<h2 id="exam-filters-heading" className="sr-only">
				Exam filters
			</h2>
			<div className="flex flex-col gap-2 border bg-card p-3 lg:flex-row lg:items-start">
				<ExamManagementSearch value={search.value} onChange={search.setValue} />
				<div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
					<ExamTagMultiSelect
						tags={tags}
						selectedIds={state.tagIds}
						onChange={actions.setTagIds}
						disabled={tagError}
						label="Filter by tags"
						showSelected={false}
					/>
					<Select
						value={state.type === null ? "all" : String(state.type)}
						onValueChange={(value) =>
							actions.setType(value === "all" || value === null ? null : value === "0" ? 0 : 1)
						}
					>
						<SelectTrigger className="w-full sm:w-32" aria-label="Filter by exam type">
							<SelectValue>
								{state.type === null ? "All types" : state.type === 0 ? "Simple" : "IELTS"}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All types</SelectItem>
							<SelectItem value="0">Simple</SelectItem>
							<SelectItem value="1">IELTS</SelectItem>
						</SelectContent>
					</Select>
					<Select
						value={state.archive}
						onValueChange={(value) => {
							if (value === "active" || value === "archived" || value === "all") {
								actions.setArchive(value)
							}
						}}
					>
						<SelectTrigger className="w-full sm:w-32" aria-label="Filter by archive status">
							<SelectValue>
								{state.archive === "active"
									? "Active"
									: state.archive === "archived"
										? "Archived"
										: "All statuses"}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="archived">Archived</SelectItem>
							<SelectItem value="all">All statuses</SelectItem>
						</SelectContent>
					</Select>
					<Select
						value={state.sort}
						onValueChange={(value) => {
							if (value === "newest" || value === "oldest") actions.setSort(value)
						}}
					>
						<SelectTrigger className="w-full sm:w-28" aria-label="Sort exams">
							<SelectValue>
								{state.sort === "newest" ? "Newest" : "Oldest"}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="newest">Newest</SelectItem>
							<SelectItem value="oldest">Oldest</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="flex min-h-7 flex-wrap items-center gap-2 text-xs">
				<FunnelIcon className="text-muted-foreground" />
				<span className="text-muted-foreground">Active filters</span>
				<Badge variant={activeFilterCount ? "secondary" : "outline"}>
					{activeFilterCount}
				</Badge>
				{state.tagIds.length > 0 && (
					<ExamTagMultiSelect
						tags={tags}
						selectedIds={state.tagIds}
						onChange={actions.setTagIds}
						label="Selected tag filters"
						showSelected
						showTrigger={false}
					/>
				)}
				{hasChanges && (
					<Button type="button" variant="ghost" size="sm" onClick={actions.clearFilters}>
						<XIcon />
						Clear filters
					</Button>
				)}
			</div>

			{tagError && (
				<Alert>
					<AlertTitle>Tags could not be loaded</AlertTitle>
					<AlertDescription>
						Tag filtering and tag selection are unavailable. Other exam controls still work.
					</AlertDescription>
					<AlertAction>
						<Button type="button" variant="outline" size="sm" onClick={onRetryTags}>
							<ArrowClockwiseIcon />
							Retry
						</Button>
					</AlertAction>
				</Alert>
			)}
		</section>
	)
}
