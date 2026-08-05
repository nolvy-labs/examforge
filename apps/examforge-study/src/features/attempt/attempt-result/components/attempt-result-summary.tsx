import Link from "next/link"
import { Clock3, RotateCcw, Trophy } from "lucide-react"

import { Button, buttonVariants } from "@/components/shadcn/button"
import { cn } from "@/lib/utils"

import type { AttemptDetail } from "../../types/attempt.type"
import {
	formatAttemptDate,
	formatAttemptNumber,
} from "../model/attempt-result"
import { Card, CardContent, CardHeader } from "@/components/shadcn/card"
import { Separator } from "@/components/shadcn/separator"
import { LocaleMessage } from "@/components/locale/locale-message"
import { useLocale, useTranslations } from "next-intl"

interface AttemptResultSummaryProps {
	detail: AttemptDetail
	submitted: boolean
	finishedAt?: string | null
	elapsedMinutes: number | null
	isRetakePending: boolean
	onRetake: () => void
}

export function AttemptResultSummary({
	detail,
	submitted,
	finishedAt,
	elapsedMinutes,
	isRetakePending,
	onRetake,
}: AttemptResultSummaryProps) {
	const locale = useLocale()
	const translate = useTranslations("attempt")
	const common = useTranslations("common")
	const exams = useTranslations("exams")
	const examHref = `/exams/${encodeURIComponent(detail.exam.slug)}`

	return (
		<Card className="w-full overflow-hidden gap-0 p-0">
			<CardHeader className="px-0">
				<div className={cn("p-6 sm:p-8", submitted ? "bg-primary text-background" : "text-background bg-warning")} >
					<p className="text-sm font-medium opacity-80">
						<LocaleMessage messageId={submitted ? "attempt.attemptSubmitted" : "attempt.attemptAbandoned"} />
					</p>
					<h1 className="mt-2 text-2xl font-bold sm:text-3xl">
						{detail.exam.title || detail.examVersion.title}
					</h1>
					{submitted && detail.score != null && detail.maximumScore != null && (
						<div className="mt-6 flex flex-wrap items-end gap-4">
							<div className="flex items-center gap-2">
								<Trophy className="size-6" />
								<span className="text-3xl font-bold">
									{formatAttemptNumber(detail.score, locale)} /{" "}
									{formatAttemptNumber(detail.maximumScore, locale)}
								</span>
							</div>
							{detail.percentage != null && (
								<span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
									{new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).format(detail.percentage / 100)}
								</span>
							)}
						</div>
					)}
				</div>
			</CardHeader>
			<CardContent className="px-0">
				<dl className="grid gap-4 p-4 sm:grid-cols-3 sm:p-6">
					<ResultFact 
						label={translate("started")}
						value={formatAttemptDate(detail.startedAtUtc, locale)}
					/>
					<ResultFact
						label={translate(submitted ? "submitted" : "abandoned")}
						value={finishedAt ? formatAttemptDate(finishedAt, locale) : common("notAvailable")}
					/>
					<ResultFact
						label={translate("timeSpent")}
						value={elapsedMinutes == null ? common("notAvailable") : exams("minutes", { count: elapsedMinutes })}
						icon={Clock3}
					/>
				</dl>
				<Separator />
				<div className="flex flex-row justify-end flex-wrap gap-2 p-4 sm:px-6">
					<Link href={examHref} className={buttonVariants({ variant: "outline" })}>
						<LocaleMessage messageId="attempt.backToExam" />
					</Link>
					<Button disabled={isRetakePending} onClick={onRetake}>
						<RotateCcw />
						<LocaleMessage messageId={isRetakePending ? "exams.starting" : "attempt.retake"} />
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}

interface ResultFactProps {
	label: string
	value: string
	icon?: typeof Clock3
}

function ResultFact({
	label,
	value,
	icon: Icon,
}: ResultFactProps) {
	return (
		<div>
			<dt className="flex items-center gap-1 text-xs text-neutral-500">
				{Icon && <Icon className="size-3.5" />}
				{label}
			</dt>
			<dd className="mt-1 text-sm font-medium text-neutral-900">{value}</dd>
		</div>
	)
}
