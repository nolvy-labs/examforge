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
import { LocaleMessage } from "@/components/locale/locale-message"
import { useTranslations } from "next-intl"

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
	const translate = useTranslations("exams")
	return (
		<div className="flex flex-col md:flex-row items-start justify-between gap-3">
			<div className="w-full">
				<h2
					id="exam-results-heading"
					ref={headingRef}
					tabIndex={-1}
					className="text-xl font-semibold outline-none"
				>
					<LocaleMessage messageId="dashboard.availableExams" />
				</h2>
				{results.data ? (
					<p className="mt-1 text-sm text-muted-foreground">
						{translate("resultCount", { count: results.data.meta.totalItems })}
					</p>
				) : (
					<p className="mt-1 text-sm text-muted-foreground"><LocaleMessage messageId="exams.loadingResults" /></p>
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
							{translate(results.sort === "oldest" ? "oldest" : "newest")}
						</SelectValue>
					</SelectTrigger>
					<SelectContent align="end">
						<SelectGroup>
							<SelectLabel><LocaleMessage messageId="exams.sort" /></SelectLabel>
							<SelectItem value="newest"><LocaleMessage messageId="exams.newest" /></SelectItem>
							<SelectItem value="oldest"><LocaleMessage messageId="exams.oldest" /></SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}
