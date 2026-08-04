import Link from "next/link"

import { Badge } from "@/components/shadcn/badge"
import { buttonVariants } from "@/components/shadcn/button"
import { Card, CardContent } from "@/components/shadcn/card"
import { TableCell, TableRow } from "@/components/shadcn/table"
import type { StudentExamAttempt } from "@/features/attempt/types/attempt.type"
import {
	getAttemptAction,
	getAttemptStatusLabel,
} from "@/features/attempt/model/attempt-summary"
import { cn } from "@/lib/utils"

import {
	formatAttemptScore,
	formatDate,
	formatNumber,
} from "../model/exam-detail"

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
	if (attempt.status === "in-progress") {
		return {
			label: "In progress",
			finishedAt: null,
			percentage: "Unavailable",
			action: "Continue",
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
	const action = getAttemptAction(attempt)
	const href = action.href

	const statusBadge = (
		<Badge variant={attempt.status === "submitted" ? "default" : "secondary"}>
			{getAttemptStatusLabel(attempt.status)}
		</Badge>
	)

	if (variant === "table") {
		return (
			<TableRow>
				<TableCell className="px-4 py-4">{formatDate(attempt.startedAtUtc)}</TableCell>
				<TableCell className="px-4 py-4">{statusBadge}</TableCell>
				<TableCell className="px-4 py-4 text-muted-foreground">
					{presentation.finishedAt ? formatDate(presentation.finishedAt) : "—"}
				</TableCell>
				<TableCell className="px-4 py-4">
					{formatAttemptScore(attempt) ?? "Unavailable"}
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
						{presentation.action}
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
