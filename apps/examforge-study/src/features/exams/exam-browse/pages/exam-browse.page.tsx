"use client"

import { ExamBrowseFilters } from "../components/exam-browse-filters"
import { ExamBrowseHeader } from "../components/exam-browse-header"
import { ExamBrowseResults } from "../components/exam-browse-results"
import { useExamBrowseQuery } from "../hooks/use-exam-browse-query"

export function ExamBrowsePage() {
	const browse = useExamBrowseQuery()

	return (
		<main className="flex-1 bg-muted/30">
			<ExamBrowseHeader search={browse.search} />
			<div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:px-8">
				<ExamBrowseFilters filters={browse.filters} />
				<ExamBrowseResults
					headingRef={browse.resultsHeadingRef}
					search={browse.appliedSearch}
					filters={browse.filters}
					results={browse.results}
				/>
			</div>
		</main>
	)
}
