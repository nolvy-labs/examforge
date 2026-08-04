import { BarChart3, FileCheck2, ListChecks } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card"

import type { StatisticsOverview } from "../types/statistics.type"
import { formatPercentage } from "../utils/statistics.format"

export function StatisticsOverviewCards({ overview }: { overview: StatisticsOverview }) {
	const cards = [
		{ label: "Completed attempts", value: String(overview.completedAttempts), icon: FileCheck2 },
		{ label: "Average score", value: formatPercentage(overview.averageScorePercentage), icon: BarChart3 },
		{ label: "Questions answered", value: String(overview.questionsAnswered), icon: ListChecks },
	]

	return (
		<section aria-labelledby="statistics-overview-heading">
			<h2 id="statistics-overview-heading" className="sr-only">Overview</h2>
			<div className="grid gap-4 sm:grid-cols-3">
				{cards.map(({ label, value, icon: Icon }) => (
					<Card key={label} className="gap-0">
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle className="text-sm font-medium text-slate-600">{label}</CardTitle>
							<Icon className="size-4 text-indigo-600" aria-hidden="true" />
						</CardHeader>
						<CardContent><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p></CardContent>
					</Card>
				))}
			</div>
		</section>
	)
}
