"use client"

import type { RefObject } from "react"

import {
	Select,
	SelectContent,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
	SelectGroup
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
		<div className="flex flex-col md:flex-row items-start justify-between gap-3">
			<div className="w-full">
				<h2
					id="exam-results-heading"
					ref={headingRef}
					tabIndex={-1}
					className="text-xl font-semibold outline-none"
				>
					Available exams
				</h2>
				{results.data ? (
					<p className="mt-1 text-sm text-muted-foreground">
						{results.data.meta.totalItems}{" "}
						{results.data.meta.totalItems === 1 ? "exam" : "exams"}
					</p>
				) : (
					<p className="mt-1 text-sm text-muted-foreground">Loading...</p>
				)}
			</div>
			<div className="w-full flex flex-wrap items-center justify-end gap-2">
				<ExamFilterSheet filters={filters} />
				<Select
					value={results.sort}
					onValueChange={(value) =>
						results.onSortChange(value === "oldest" ? "oldest" : "newest")
					}
				>
					<SelectTrigger className="lg:min-w-40">
						<SelectValue>
							{results.sort === "oldest" ? "Oldest" : "Newest"}
						</SelectValue>
					</SelectTrigger>
					<SelectContent align="end">
						<SelectGroup>
							<SelectLabel>Sort</SelectLabel>
							<SelectItem value="newest">Newest</SelectItem>
							<SelectItem value="oldest">Oldest</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}
