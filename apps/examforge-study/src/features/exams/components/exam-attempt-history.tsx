import Link from "next/link"
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react"

import { Button, buttonVariants } from "@/components/shadcn/button"
import { cn } from "@/lib/utils"

import {
	formatAttemptScore,
	formatDate,
	formatNumber,
} from "../model/exam-detail.model"
import type {
	StudentExamAttempt,
	StudentExamAttemptPage,
} from "../model/exam-detail.types"

export function AttemptHistory({
	data,
	isPending,
	isError,
	isFetching,
	isPlaceholderData,
	onRetry,
	onPageChange,
}: {
	data?: StudentExamAttemptPage
	isPending: boolean
	isError: boolean
	isFetching: boolean
	isPlaceholderData: boolean
	onRetry: () => void
	onPageChange: (page: number) => void
}) {
	return (
		<section aria-labelledby="past-attempts-heading" className="space-y-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 id="past-attempts-heading" className="text-xl font-semibold text-slate-950">
						Past Attempts
					</h2>
					<p className="mt-1 text-sm text-slate-600">
						Submitted and abandoned attempts for this exam.
					</p>
				</div>
				{isFetching && data && (
					<span className="flex items-center gap-2 text-xs text-slate-500">
						<LoaderCircle
							className="size-3.5 animate-spin motion-reduce:animate-none"
							aria-hidden="true"
						/>
						Refreshing
					</span>
				)}
			</div>

			{isPending ? (
				<HistorySkeleton />
			) : isError ? (
				<div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
					<p className="text-sm text-amber-900">
						We couldn’t load your past attempts.
					</p>
					<Button type="button" variant="outline" className="mt-3" onClick={onRetry}>
						Try again
					</Button>
				</div>
			) : !data?.items.length ? (
				<div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
					You have no past attempts for this exam.
				</div>
			) : (
				<>
					<div className={cn(
						"hidden overflow-hidden rounded-xl border bg-white md:block",
						isPlaceholderData && "opacity-60"
					)}>
						<table className="w-full text-left text-sm">
							<thead className="border-b bg-slate-50 text-xs text-slate-600">
								<tr>
									<th scope="col" className="px-4 py-3 font-medium">Started</th>
									<th scope="col" className="px-4 py-3 font-medium">Status</th>
									<th scope="col" className="px-4 py-3 font-medium">Finished</th>
									<th scope="col" className="px-4 py-3 font-medium">Score</th>
									<th scope="col" className="px-4 py-3 font-medium">Percentage</th>
									<th scope="col" className="px-4 py-3 text-right font-medium">Action</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{data.items.map((attempt) => (
									<HistoryRow key={attempt.attemptId} attempt={attempt} />
								))}
							</tbody>
						</table>
					</div>
					<div className={cn(
						"space-y-3 md:hidden",
						isPlaceholderData && "opacity-60"
					)}>
						{data.items.map((attempt) => (
							<HistoryCard key={attempt.attemptId} attempt={attempt} />
						))}
					</div>
					<HistoryPagination data={data} onPageChange={onPageChange} />
				</>
			)}
		</section>
	)
}

function HistoryRow({ attempt }: { attempt: StudentExamAttempt }) {
	const presentation = getAttemptPresentation(attempt)
	return (
		<tr>
			<td className="px-4 py-4 text-slate-700">{formatDate(attempt.startedAtUtc)}</td>
			<td className="px-4 py-4">
				<StatusBadge status={presentation.status} label={presentation.label} />
			</td>
			<td className="px-4 py-4 text-slate-600">
				{presentation.finishedAt ? formatDate(presentation.finishedAt) : "—"}
			</td>
			<td className="px-4 py-4 text-slate-700">
				{formatAttemptScore(attempt) ?? "Unavailable"}
			</td>
			<td className="px-4 py-4 text-slate-700">{presentation.percentage}</td>
			<td className="px-4 py-4 text-right">
				<ReviewLink attempt={attempt} label={presentation.action} />
			</td>
		</tr>
	)
}

function HistoryCard({ attempt }: { attempt: StudentExamAttempt }) {
	const presentation = getAttemptPresentation(attempt)
	return (
		<article className="rounded-xl border bg-white p-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs text-slate-500">Started</p>
					<p className="mt-1 text-sm font-medium">{formatDate(attempt.startedAtUtc)}</p>
				</div>
				<StatusBadge status={presentation.status} label={presentation.label} />
			</div>
			<dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
				<div>
					<dt className="text-xs text-slate-500">Finished</dt>
					<dd className="mt-1">
						{presentation.finishedAt ? formatDate(presentation.finishedAt) : "—"}
					</dd>
				</div>
				<div>
					<dt className="text-xs text-slate-500">Score</dt>
					<dd className="mt-1">{formatAttemptScore(attempt) ?? "Unavailable"}</dd>
				</div>
			</dl>
			<ReviewLink attempt={attempt} label={presentation.action} className="mt-4 w-full" />
		</article>
	)
}

function getAttemptPresentation(attempt: StudentExamAttempt) {
	if (attempt.status === "submitted") {
		return {
			status: attempt.status,
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
		status: attempt.status,
		label: "Abandoned",
		finishedAt: attempt.abandonedAtUtc,
		percentage: "Unavailable",
		action: "Review Attempt",
	}
}

function StatusBadge({
	status,
	label,
}: {
	status: StudentExamAttempt["status"]
	label: string
}) {
	return (
		<span className={cn(
			"inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
			status === "submitted"
				? "bg-emerald-50 text-emerald-700"
				: "bg-amber-50 text-amber-800"
		)}>
			{label}
		</span>
	)
}

function ReviewLink({
	attempt,
	label,
	className,
}: {
	attempt: StudentExamAttempt
	label: string
	className?: string
}) {
	return (
		<Link
			href={`/attempts/${attempt.attemptId}/result`}
			className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}
		>
			{label}
		</Link>
	)
}

function HistoryPagination({
	data,
	onPageChange,
}: {
	data: StudentExamAttemptPage
	onPageChange: (page: number) => void
}) {
	if (data.meta.totalPages <= 1) return null
	return (
		<nav aria-label="Past attempt pages" className="flex items-center justify-between gap-3">
			<Button
				type="button"
				variant="outline"
				disabled={!data.meta.hasPreviousPage}
				onClick={() => onPageChange(data.meta.page - 1)}
			>
				<ChevronLeft aria-hidden="true" />
				Previous
			</Button>
			<span className="text-sm text-slate-600">
				Page {data.meta.page} of {data.meta.totalPages}
			</span>
			<Button
				type="button"
				variant="outline"
				disabled={!data.meta.hasNextPage}
				onClick={() => onPageChange(data.meta.page + 1)}
			>
				Next
				<ChevronRight aria-hidden="true" />
			</Button>
		</nav>
	)
}

function HistorySkeleton() {
	return (
		<div aria-hidden="true" className="space-y-3">
			{[1, 2, 3].map((item) => (
				<div
					key={item}
					className="h-20 animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none"
				/>
			))}
		</div>
	)
}
