import Link from "next/link"

import { Badge } from "@/components/shadcn/badge"
import { buttonVariants } from "@/components/shadcn/button"
import { Card, CardContent } from "@/components/shadcn/card"
import { TableCell, TableRow } from "@/components/shadcn/table"
import type { StudentExamAttempt } from "@/features/attempt/types/attempt.type"
import {
	getAttemptActionHref,
} from "@/features/attempt/model/attempt-summary"
import { cn } from "@/lib/utils"
import { LocaleMessage } from "@/components/locale/locale-message"
import { useLocale, useTranslations } from "next-intl"

import {
	formatAttemptScore,
	formatDate,
} from "../model/exam-detail"

function getAttemptPresentation(attempt: StudentExamAttempt, locale: string, unavailable: string) {
	if (attempt.status === "submitted") {
		return {
			finishedAt: attempt.submittedAtUtc,
			percentage:
				attempt.percentage == null
					? unavailable
					: new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).format(attempt.percentage / 100),
		}
	}
	if (attempt.status === "in-progress") {
		return {
			finishedAt: null,
			percentage: unavailable,
		}
	}
	return {
		finishedAt: attempt.abandonedAtUtc,
		percentage: unavailable,
	}
}

interface Props {
	attempt: StudentExamAttempt
	variant: "table" | "card"
}

export function ExamAttemptHistoryItem({ attempt, variant }: Props) {
	const locale = useLocale()
	const translateAttempt = useTranslations("attempt")
	const translateHistory = useTranslations("history")
	const translateCommon = useTranslations("common")
	const presentation = getAttemptPresentation(attempt, locale, translateCommon("notAvailable"))
	const href = getAttemptActionHref(attempt)

	const statusBadge = (
		<Badge variant={attempt.status === "submitted" ? "default" : "secondary"}>
			{translateAttempt(attempt.status === "in-progress" ? "inProgress" : attempt.status)}
		</Badge>
	)

	if (variant === "table") {
		return (
			<TableRow>
				<TableCell className="px-4 py-4">{formatDate(attempt.startedAtUtc, true, locale, translateCommon("notAvailable"))}</TableCell>
				<TableCell className="px-4 py-4">{statusBadge}</TableCell>
				<TableCell className="px-4 py-4 text-muted-foreground">
					{presentation.finishedAt ? formatDate(presentation.finishedAt, true, locale, translateCommon("notAvailable")) : translateCommon("notAvailable")}
				</TableCell>
				<TableCell className="px-4 py-4">
					{formatAttemptScore(attempt, locale) ?? translateCommon("notAvailable")}
				</TableCell>
				<TableCell className="px-4 py-4">{presentation.percentage}</TableCell>
				<TableCell className="px-4 py-4 text-right">
					<Link
						href={href}
						className={buttonVariants({
							variant: "outline",
							size: "sm",
						})}
					>
						{translateHistory(attempt.status === "in-progress" ? "inProgress" : "reviewAttempt")}
					</Link>
				</TableCell>
			</TableRow>
		)
	}

	return (
			<Card size="sm">
				<CardContent>
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-xs text-muted-foreground"><LocaleMessage messageId="exams.started" /></p>
							<p className="mt-1 text-sm font-medium">
								{formatDate(attempt.startedAtUtc, true, locale, translateCommon("notAvailable"))}
							</p>
						</div>
						{statusBadge}
					</div>
					<dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
						<div>
							<dt className="text-xs text-muted-foreground"><LocaleMessage messageId="exams.finished" /></dt>
							<dd className="mt-1">
								{presentation.finishedAt
									? formatDate(presentation.finishedAt, true, locale, translateCommon("notAvailable"))
									: translateCommon("notAvailable")}
							</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground"><LocaleMessage messageId="exams.score" /></dt>
							<dd className="mt-1">
								{formatAttemptScore(attempt, locale) ?? translateCommon("notAvailable")}
							</dd>
						</div>
					</dl>
					<Link
						href={href}
						className={cn(
							buttonVariants({ variant: "outline", size: "sm" }),
							"mt-4 w-full"
						)}
					>
						{translateHistory(attempt.status === "in-progress" ? "inProgress" : "reviewAttempt")}
					</Link>
				</CardContent>
			</Card>
	)
}
