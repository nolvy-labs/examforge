"use client"

import type { RefObject } from "react"

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/shadcn/select"

import type {
	ExamBrowseFiltersViewModel,
	ExamBrowseResultsViewModel,
} from "../hooks/use-exam-browse-query"
import { ExamFilterSheet } from "./exam-filter-sheet"

interface Props {
	headingRef: RefObject<HTMLHeadingElement | null>
	filters: ExamBrowseFiltersViewModel
	results: ExamBrowseResultsViewModel
}

export function ExamResultsHeader({
	headingRef,
	filters,
	results,
}: Props) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h2
					id="exam-results-heading"
					ref={headingRef}
					tabIndex={-1}
					className="text-xl font-semibold outline-none"
				>
					Available exams
				</h2>
				{results.data && (
					<p className="mt-1 text-sm text-muted-foreground">
						{results.data.meta.totalItems}{" "}
						{results.data.meta.totalItems === 1 ? "exam" : "exams"}
					</p>
				)}
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<ExamFilterSheet filters={filters} />
				<Select
					value={results.sort}
					onValueChange={(value) =>
						results.onSortChange(value === "oldest" ? "oldest" : "newest")
					}
				>
					<SelectTrigger>
						<SelectValue>
							{results.sort === "oldest" ? "Oldest" : "Newest"}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="newest">Newest</SelectItem>
						<SelectItem value="oldest">Oldest</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}
