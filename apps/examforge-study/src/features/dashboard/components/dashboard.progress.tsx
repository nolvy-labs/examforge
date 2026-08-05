"use client"

import { AlertCircle, BarChart3, FileCheck2, ListChecks } from "lucide-react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Skeleton } from "@/components/shadcn/skeleton"
import { useDashboardStatistics } from "@/features/statistics/hooks/statistics.hook"
import { formatPercentage } from "@/features/statistics/utils/statistics.format"
import { MetricCard } from "@/features/statistics/components/statistics-overview"
import { LocaleMessage } from "@/components/locale/locale-message"
import { useLocale, useTranslations } from "next-intl"

export function DashboardProgress() {
	const query = useDashboardStatistics()
	const locale = useLocale()
	const translate = useTranslations("dashboard")

	return (
		<section className="flex flex-col gap-4" aria-labelledby="progress-heading">
			<h2 id="progress-heading" className="text-xl font-semibold tracking-tight text-foreground">
				<LocaleMessage messageId="dashboard.progressOverview" />
			</h2>
			{query.isPending ? (
				<div className="grid gap-4 sm:grid-cols-3" aria-label={translate("progressOverview")}>
					{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-32 w-full" />)}
				</div>
			) : query.isError ? (
				<Alert>
					<AlertCircle />
					<AlertDescription>
						<p><LocaleMessage messageId="dashboard.progressError" /></p>
						<Button type="button" variant="outline" className="mt-3" onClick={() => void query.refetch()}>
							<LocaleMessage messageId="common.retry" />
						</Button>
					</AlertDescription>
				</Alert>
			) : (
				<div className="grid gap-4 sm:grid-cols-3">
					<MetricCard label={translate("completedAttempts")} value={new Intl.NumberFormat(locale).format(query.data.completedAttempts)} icon={FileCheck2} />
					<MetricCard label={translate("averageScore")} value={formatPercentage(query.data.averageScorePercentage, locale, translate("emptyAttempts"))} icon={BarChart3} />
					<MetricCard label={translate("questionsAnswered")} value={new Intl.NumberFormat(locale).format(query.data.questionsAnswered)} icon={ListChecks} />
				</div>
			)}
		</section>
	)
}