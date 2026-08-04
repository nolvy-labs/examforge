import Link from "next/link"

import { Badge } from "@/components/shadcn/badge"
import { buttonVariants } from "@/components/shadcn/button"
import { Card, CardContent } from "@/components/shadcn/card"
import { TableCell, TableRow } from "@/components/shadcn/table"
import {
	formatAttemptSummaryDate,
	formatAttemptSummaryScore,
	getAttemptAction,
	getAttemptStatusLabel,
} from "@/features/attempt/model/attempt-summary"
import type { StudentExamAttempt } from "@/features/attempt/types/attempt.type"
function AttemptValues({ attempt }: { attempt: StudentExamAttempt }) {
	const score = formatAttemptSummaryScore(attempt)
	return (
		<>
			<div><dt>Created</dt><dd>{formatAttemptSummaryDate(attempt.createdAtUtc)}</dd></div>
			<div><dt>Last updated</dt><dd>{formatAttemptSummaryDate(attempt.updatedAtUtc)}</dd></div>
			<div><dt>Score / result</dt><dd>{score ?? "Not available"}</dd></div>
		</>
	)
}

export function HistoryAttemptItem({
	attempt,
	variant,
}: {
	attempt: StudentExamAttempt
	variant: "table" | "card"
}) {
	const action = getAttemptAction(attempt)
	const badge = (
		<Badge variant={attempt.status === "submitted" ? "default" : "secondary"}>
			{getAttemptStatusLabel(attempt.status)}
		</Badge>
	)
	const actionLink = (
		<Link
			href={action.href}
			aria-label={`${action.label} ${attempt.examTitle || "exam"}`}
			className={buttonVariants({ variant: "outline", size: "sm" })}
		>
			{action.label}
		</Link>
	)

	if (variant === "table") {
		return (
			<TableRow>
				<TableCell className="max-w-72 whitespace-normal px-4 py-4 font-medium"><span className="line-clamp-2">{attempt.examTitle || "Untitled exam"}</span></TableCell>
				<TableCell className="px-4 py-4">{badge}</TableCell>
				<TableCell className="px-4 py-4">{formatAttemptSummaryDate(attempt.createdAtUtc)}</TableCell>
				<TableCell className="px-4 py-4">{formatAttemptSummaryDate(attempt.updatedAtUtc)}</TableCell>
				<TableCell className="px-4 py-4">{formatAttemptSummaryScore(attempt) ?? "Not available"}</TableCell>
				<TableCell className="px-4 py-4 text-right">{actionLink}</TableCell>
			</TableRow>
		)
	}

	return (
		<Card size="sm">
			<CardContent>
				<div className="flex items-start justify-between gap-3">
					<h2 className="min-w-0 break-words font-semibold">{attempt.examTitle || "Untitled exam"}</h2>
					{badge}
				</div>
				<dl className="mt-4 grid gap-3 text-xs text-slate-500 [&_dd]:mt-1 [&_dd]:text-sm [&_dd]:font-medium [&_dd]:text-slate-900 sm:grid-cols-3">
					<AttemptValues attempt={attempt} />
				</dl>
				<div className="mt-4">{actionLink}</div>
			</CardContent>
		</Card>
	)
}
