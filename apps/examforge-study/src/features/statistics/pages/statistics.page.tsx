"use client"

import { Fragment, useEffect, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, LoaderCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Skeleton } from "@/components/shadcn/skeleton"

import { ExamPerformanceSection } from "../components/exam-performance"
import { QuestionTypePerformanceSection } from "../components/question-type-performance"
import { ScoreTrendChart } from "../components/score-trend-chart"
import { StatisticsOverviewCards } from "../components/statistics-overview"
import { useStudentStatistics } from "../hooks/statistics.hook"
import { getNormalizedStatisticsQuery, parseStatisticsFilters } from "../utils/statistics.filter"
import { LocaleMessage } from "@/components/locale/locale-message"
import { useTranslations } from "next-intl"

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

	return (
		<main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight"><LocaleMessage messageId="statistics.title" /></h1>
				</div>
				{query.isFetching && query.data ? <span className="flex items-center gap-2 text-xs text-neutral-500" role="status"><LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" /><LocaleMessage messageId="statistics.updating" /></span> : null}
			</div>

			{query.isPending ? <StatisticsSkeleton /> : query.isError ? (
				<Alert><AlertCircle /><AlertDescription><p><LocaleMessage messageId="statistics.loadError" /></p><Button type="button" variant="outline" className="mt-3" onClick={() => void query.refetch()}><LocaleMessage messageId="common.retry" /></Button></AlertDescription></Alert>
			) : query.data ? (
				<Fragment>
					<StatisticsOverviewCards overview={query.data.overview} />
					<ScoreTrendChart points={query.data.scoreTrend} />
					<ExamPerformanceSection exams={query.data.performanceByExam} />
					<QuestionTypePerformanceSection rows={query.data.performanceByQuestionType} />
				</Fragment>
			) : null}
		</main>
	)
}

function StatisticsSkeleton() {
	return <div className="space-y-6" aria-label={useTranslations("accessibility")("loadingStatistics")}><div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-32" />)}</div><Skeleton className="h-80" /><Skeleton className="h-72" /></div>
}
