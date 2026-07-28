import Link from "next/link"

import { Badge } from "@/components/shadcn/badge"
import { buttonVariants } from "@/components/shadcn/button"
import { Card, CardContent } from "@/components/shadcn/card"
import type { StudentExamAttempt } from "@/features/attempt/types/attempt.type"
import { cn } from "@/lib/utils"

import {
	formatAttemptScore,
	formatDate,
	formatNumber,
} from "../model/exam-detail"
import { useMemo } from "react"

function getAttemptPresentation(attempt: StudentExamAttempt) {
	if (attempt.status === "submitted") {
		return {
			label: "Submitted",
			finishedAt: attempt.submittedAtUtc,
			percentage:
				attempt.percentage == null
					? "Unavailable"
					: `${formatNumber(attempt.percentage)}%`,
			action: "View Result",
		}
	}
	return {
		label: "Abandoned",
		finishedAt: attempt.abandonedAtUtc,
		percentage: "Unavailable",
		action: "Review Attempt",
	}
}

interface Props {
	attempt: StudentExamAttempt
	variant: "table" | "card"
}

export function ExamAttemptHistoryItem({ attempt, variant }: Props) {
	const presentation = getAttemptPresentation(attempt)
	
	const href = `/attempts/${attempt.attemptId}/result`

	const statusBadge = useMemo(() => (
		<Badge variant={attempt.status === "submitted" ? "default" : "secondary"}>
			{presentation.label}
		</Badge>
	), [attempt.status, presentation.label])

	if (variant === "table") {
		return (
			<tr>
				<td className="px-4 py-4">{formatDate(attempt.startedAtUtc)}</td>
				<td className="px-4 py-4">{statusBadge}</td>
				<td className="px-4 py-4 text-muted-foreground">
					{presentation.finishedAt ? formatDate(presentation.finishedAt) : "—"}
				</td>
				<td className="px-4 py-4">
					{formatAttemptScore(attempt) ?? "Unavailable"}
				</td>
				<td className="px-4 py-4">{presentation.percentage}</td>
				<td className="px-4 py-4 text-right">
					<Link
						href={href}
						className={buttonVariants({
							variant: "outline",
							size: "sm",
						})}
					>
						{presentation.action}
					</Link>
				</td>
			</tr>
		)
	}

	return (
			<Card size="sm">
				<CardContent>
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-xs text-muted-foreground">Started</p>
							<p className="mt-1 text-sm font-medium">
								{formatDate(attempt.startedAtUtc)}
							</p>
						</div>
						{statusBadge}
					</div>
					<dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
						<div>
							<dt className="text-xs text-muted-foreground">Finished</dt>
							<dd className="mt-1">
								{presentation.finishedAt
									? formatDate(presentation.finishedAt)
									: "—"}
							</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Score</dt>
							<dd className="mt-1">
								{formatAttemptScore(attempt) ?? "Unavailable"}
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
						{presentation.action}
					</Link>
				</CardContent>
			</Card>
	)
}
