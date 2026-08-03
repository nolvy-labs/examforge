import Link from "next/link"
import { Clock3, RotateCcw, Trophy } from "lucide-react"

import { Button, buttonVariants } from "@/components/shadcn/button"
import { cn } from "@/lib/utils"

import type { AttemptDetail } from "../../types/attempt.type"
import {
	formatAttemptDate,
	formatAttemptNumber,
} from "../model/attempt-result"

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
	const examHref = `/exams/${encodeURIComponent(detail.exam.slug)}`

	return (
		<section className="mt-5 overflow-hidden rounded-2xl border bg-white shadow-sm">
			<div
				className={cn(
					"p-6 sm:p-8",
					submitted ? "bg-indigo-950 text-white" : "bg-amber-50"
				)}
			>
				<p className="text-sm font-medium opacity-80">
					{submitted ? "Attempt submitted" : "Attempt abandoned"}
				</p>
				<h1 className="mt-2 text-2xl font-bold sm:text-3xl">
					{detail.examVersion.title || detail.exam.title}
				</h1>
				{submitted && detail.score != null && detail.maximumScore != null && (
					<div className="mt-6 flex flex-wrap items-end gap-4">
						<div className="flex items-center gap-2">
							<Trophy className="size-6" />
							<span className="text-3xl font-bold">
								{formatAttemptNumber(detail.score)} /{" "}
								{formatAttemptNumber(detail.maximumScore)}
							</span>
						</div>
						{detail.percentage != null && (
							<span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
								{formatAttemptNumber(detail.percentage)}%
							</span>
						)}
					</div>
				)}
			</div>
			<dl className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
				<ResultFact label="Started" value={formatAttemptDate(detail.startedAtUtc)} />
				<ResultFact
					label={submitted ? "Submitted" : "Abandoned"}
					value={finishedAt ? formatAttemptDate(finishedAt) : "Unavailable"}
				/>
				<ResultFact
					label="Time spent"
					value={elapsedMinutes == null ? "Unavailable" : `${elapsedMinutes} min`}
					icon={Clock3}
				/>
			</dl>
			<div className="flex flex-wrap gap-2 border-t px-6 py-4 sm:px-8">
				<Link href={examHref} className={buttonVariants({ variant: "outline" })}>
					Return to exam
				</Link>
				<Button disabled={isRetakePending} onClick={onRetake}>
					<RotateCcw />
					{isRetakePending ? "Starting…" : "Retake"}
				</Button>
			</div>
		</section>
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
			<dt className="flex items-center gap-1 text-xs text-slate-500">
				{Icon && <Icon className="size-3.5" />}
				{label}
			</dt>
			<dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
		</div>
	)
}
