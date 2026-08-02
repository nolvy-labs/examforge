"use client"

import { ExamBrowseFilters } from "../components/exam-browse-filters"
import { ExamBrowseResults } from "../components/exam-browse-results"
import { ExamBrowseSearch } from "../components/exam-browse-search"
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

interface ExamBrowseHeaderProps {
	search: {
		value: string
		setValue: (value: string) => void
		submit: () => void
	}
}

export function ExamBrowseHeader({ search }: ExamBrowseHeaderProps) {
	return (
		<section className="border-b bg-background">
			<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
				<div className="max-w-3xl">
					<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
						Browse Exams
					</h1>
				</div>
				<ExamBrowseSearch
					value={search.value}
					onChange={search.setValue}
					onSubmit={search.submit}
				/>
			</div>
		</section>
	)
}