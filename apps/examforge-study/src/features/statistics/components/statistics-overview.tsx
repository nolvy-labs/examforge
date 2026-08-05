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
					<MetricCard key={label} label={label} value={value} icon={Icon} />
				))}
			</div>
		</section>
	)
}

export function MetricCard({
	label,
	value,
	icon: Icon,
}: {
	label: string
	value: string
	icon: typeof FileCheck2
}) {
	return (
		<Card className="flex flex-col gap-0">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="font-semibold">{label}</CardTitle>
				<span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
					<Icon className="size-4" />
				</span>
			</CardHeader>
			<CardContent>
				<p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
			</CardContent>
		</Card>
	)
}