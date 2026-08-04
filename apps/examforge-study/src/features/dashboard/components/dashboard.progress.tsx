"use client"

import { AlertCircle, BarChart3, FileCheck2, ListChecks } from "lucide-react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card"
import { Skeleton } from "@/components/shadcn/skeleton"
import { useDashboardStatistics } from "@/features/statistics/hooks/statistics.hook"
import { formatPercentage } from "@/features/statistics/utils/statistics.format"

export function DashboardProgress() {
	const query = useDashboardStatistics()

	return (
		<section className="flex flex-col gap-4" aria-labelledby="progress-heading">
			<h2 id="progress-heading" className="text-xl font-semibold tracking-tight text-slate-950">
				Progress overview
			</h2>
			{query.isPending ? (
				<div className="grid gap-4 sm:grid-cols-3" aria-label="Loading progress overview">
					{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-32 w-full" />)}
				</div>
			) : query.isError ? (
				<Alert>
					<AlertCircle />
					<AlertDescription>
						<p>We couldn&apos;t load your progress.</p>
						<Button type="button" variant="outline" className="mt-3" onClick={() => void query.refetch()}>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			) : (
				<div className="grid gap-4 sm:grid-cols-3">
					<MetricCard label="Completed attempts" value={String(query.data.completedAttempts)} icon={FileCheck2} />
					<MetricCard label="Average score" value={formatPercentage(query.data.averageScorePercentage)} icon={BarChart3} />
					<MetricCard label="Questions answered" value={String(query.data.questionsAnswered)} icon={ListChecks} />
				</div>
			)}
		</section>
	)
}

function MetricCard({
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
				<span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600" aria-hidden="true">
					<Icon className="size-4" />
				</span>
			</CardHeader>
			<CardContent>
				<p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
			</CardContent>
		</Card>
	)
}
