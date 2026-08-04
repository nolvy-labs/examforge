"use client"

import { useEffect, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, LoaderCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select"
import { Skeleton } from "@/components/shadcn/skeleton"

import { ExamPerformanceSection } from "../components/exam-performance"
import { QuestionTypePerformanceSection } from "../components/question-type-performance"
import { ScoreTrendChart } from "../components/score-trend-chart"
import { StatisticsOverviewCards } from "../components/statistics-overview"
import { useStudentStatistics } from "../hooks/statistics.hook"
import type { StatisticsMode, StatisticsPeriod } from "../types/statistics.type"
import { getNormalizedStatisticsQuery, parseStatisticsFilters, serializeStatisticsFilters } from "../utils/statistics.filter"

const periodOptions: Array<{ value: StatisticsPeriod; label: string }> = [
	{ value: "30d", label: "Last 30 days" },
	{ value: "90d", label: "Last 90 days" },
	{ value: "all", label: "All time" },
]
const modeOptions: Array<{ value: StatisticsMode; label: string }> = [
	{ value: "all", label: "All" },
	{ value: "practice", label: "Practice" },
	{ value: "exam", label: "Exam" },
]

export function StatisticsPage() {
	const pathname = usePathname()
	const router = useRouter()
	const searchParams = useSearchParams()
	const rawQuery = searchParams.toString()
	const filters = useMemo(() => parseStatisticsFilters(new URLSearchParams(rawQuery)), [rawQuery])
	const query = useStudentStatistics(filters.period, filters.mode)

	useEffect(() => {
		const normalized = getNormalizedStatisticsQuery(new URLSearchParams(rawQuery))
		if (normalized !== rawQuery) router.replace(`${pathname}?${normalized}`, { scroll: false })
	}, [pathname, rawQuery, router])

	function update(next: Partial<typeof filters>) {
		const params = serializeStatisticsFilters({ ...filters, ...next }, new URLSearchParams(rawQuery))
		router.push(`${pathname}?${params.toString()}`, { scroll: false })
	}

	return (
		<main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
				</div>
				{query.isFetching && query.data ? <span className="flex items-center gap-2 text-xs text-slate-500" role="status"><LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />Updating statistics</span> : null}
			</div>

			{/* <div className="flex flex-col gap-4 rounded-xl border bg-white p-4 sm:flex-row sm:items-end">
				<Filter label="Period" value={filters.period} options={periodOptions} onChange={(value) => update({ period: value as StatisticsPeriod })} />
				<Filter label="Mode" value={filters.mode} options={modeOptions} onChange={(value) => update({ mode: value as StatisticsMode })} />
			</div> */}

			{query.isPending ? <StatisticsSkeleton /> : query.isError ? (
				<Alert><AlertCircle /><AlertDescription><p>We couldn&apos;t load your statistics.</p><Button type="button" variant="outline" className="mt-3" onClick={() => void query.refetch()}>Try again</Button></AlertDescription></Alert>
			) : query.data ? (
				<>
					<StatisticsOverviewCards overview={query.data.overview} />
					<ScoreTrendChart points={query.data.scoreTrend} />
					<ExamPerformanceSection exams={query.data.performanceByExam} />
					<QuestionTypePerformanceSection rows={query.data.performanceByQuestionType} />
				</>
			) : null}
		</main>
	)
}

function Filter({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
	return <label className="grid min-w-48 gap-1.5 text-sm font-medium">{label}<Select value={value} onValueChange={(next) => { if (next != null) onChange(next) }}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent></Select></label>
}

function StatisticsSkeleton() {
	return <div className="space-y-6" aria-label="Loading statistics"><div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-32" />)}</div><Skeleton className="h-80" /><Skeleton className="h-72" /></div>
}
