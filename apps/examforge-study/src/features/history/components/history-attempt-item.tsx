"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"

import { LocaleMessage } from "@/components/locale/locale-message"
import { Badge } from "@/components/shadcn/badge"
import { buttonVariants } from "@/components/shadcn/button"
import { Card, CardContent } from "@/components/shadcn/card"
import { TableCell, TableRow } from "@/components/shadcn/table"
import { formatAttemptSummaryDate, formatAttemptSummaryScore, getAttemptActionHref } from "@/features/attempt/model/attempt-summary"
import type { StudentExamAttempt } from "@/features/attempt/types/attempt.type"

function statusKey(status: StudentExamAttempt["status"]) {
	return status === "in-progress" ? "inProgress" as const : status
}

function AttemptValues({ attempt }: { attempt: StudentExamAttempt }) {
	const locale = useLocale()
	const common = useTranslations("common")
	const score = formatAttemptSummaryScore(attempt, locale)
	return <>
		<div><dt><LocaleMessage messageId="history.created" /></dt><dd>{formatAttemptSummaryDate(attempt.createdAtUtc, locale, common("notAvailable"))}</dd></div>
		<div><dt><LocaleMessage messageId="history.updated" /></dt><dd>{formatAttemptSummaryDate(attempt.updatedAtUtc, locale, common("notAvailable"))}</dd></div>
		<div><dt><LocaleMessage messageId="history.scoreResult" /></dt><dd>{score ?? common("notAvailable")}</dd></div>
	</>
}

export function HistoryAttemptItem({ attempt, variant }: { attempt: StudentExamAttempt; variant: "table" | "card" }) {
	const locale = useLocale()
	const attemptMessages = useTranslations("attempt")
	const dashboard = useTranslations("dashboard")
	const history = useTranslations("history")
	const common = useTranslations("common")
	const actionHref = getAttemptActionHref(attempt)
	const actionLabel = attempt.status === "in-progress" ? dashboard("continueAction") : history("reviewAttempt")
	const title = attempt.examTitle || dashboard("untitledExam")
	const badge = <Badge variant={attempt.status === "submitted" ? "default" : "secondary"}>{attemptMessages(statusKey(attempt.status))}</Badge>
	const actionLink = <Link href={actionHref} aria-label={`${actionLabel} ${title}`} className={buttonVariants({ variant: "outline", size: "sm" })}>{actionLabel}</Link>

	if (variant === "table") return <TableRow>
		<TableCell className="max-w-72 whitespace-normal px-4 py-4 font-medium"><span className="line-clamp-2">{title}</span></TableCell>
		<TableCell className="px-4 py-4">{badge}</TableCell>
		<TableCell className="px-4 py-4">{formatAttemptSummaryDate(attempt.createdAtUtc, locale, common("notAvailable"))}</TableCell>
		<TableCell className="px-4 py-4">{formatAttemptSummaryDate(attempt.updatedAtUtc, locale, common("notAvailable"))}</TableCell>
		<TableCell className="px-4 py-4">{formatAttemptSummaryScore(attempt, locale) ?? common("notAvailable")}</TableCell>
		<TableCell className="px-4 py-4 text-right">{actionLink}</TableCell>
	</TableRow>

	return <Card size="sm"><CardContent><div className="flex items-start justify-between gap-3"><h2 className="min-w-0 break-words font-semibold">{title}</h2>{badge}</div><dl className="mt-4 grid gap-3 text-xs text-neutral-500 [&_dd]:mt-1 [&_dd]:text-sm [&_dd]:font-medium [&_dd]:text-neutral-900 sm:grid-cols-3"><AttemptValues attempt={attempt} /></dl><div className="mt-4">{actionLink}</div></CardContent></Card>
}
