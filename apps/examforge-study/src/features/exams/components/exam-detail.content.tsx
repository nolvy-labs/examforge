import Link from "next/link"
import {
	BookOpen,
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	Clock3,
	FileQuestion,
	Layers3,
	LoaderCircle,
	Trophy,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/shadcn/button"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/shadcn/card"
import { cn } from "@/lib/utils"

import {
	formatAttemptScore,
	formatNumber,
	getExamCounts,
	getExamTypeLabel,
	getOrderedSections,
	getSectionFacts,
	getSectionKindLabel,
} from "../model/exam-detail.model"
import type {
	StudentExamAttempt,
	StudentExamAttemptPage,
	StudentExamDetail,
} from "../model/exam-detail.types"

export function ExamOverview({ detail }: { detail: StudentExamDetail }) {
	return (
		<section aria-labelledby="exam-overview-heading">
			<div className="flex flex-wrap gap-2">
				<span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
					{getExamTypeLabel(detail.exam.type)}
				</span>
				{detail.exam.tags.map((tag) => (
					<span
						key={tag.id}
						className="max-w-full break-words rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
					>
						{tag.name}
					</span>
				))}
			</div>
			<h1
				id="exam-overview-heading"
				className="mt-5 break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
			>
				{detail.exam.title}
			</h1>
			{detail.exam.description && (
				<p className="mt-4 max-w-3xl whitespace-pre-line break-words text-base leading-7 text-slate-600 sm:text-lg">
					{detail.exam.description}
				</p>
			)}
		</section>
	)
}

export function ExamBody({ detail }: { detail: StudentExamDetail }) {
	const sections = getOrderedSections(detail)
	return (
		<div className="space-y-8">
			{detail.publishedVersion.instructions.trim() && (
				<section
					aria-labelledby="exam-instructions-heading"
					className="rounded-2xl border border-slate-200 bg-white p-6"
				>
					<h2
						id="exam-instructions-heading"
						className="text-xl font-semibold text-slate-950"
					>
						Instructions
					</h2>
					<p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-slate-700">
						{detail.publishedVersion.instructions}
					</p>
				</section>
			)}

			<section aria-labelledby="exam-sections-heading">
				<div>
					<h2
						id="exam-sections-heading"
						className="text-xl font-semibold text-slate-950"
					>
						Exam sections
					</h2>
					<p className="mt-1 text-sm text-slate-600">
						Review the structure before beginning your attempt.
					</p>
				</div>
				<div className="mt-4 space-y-3">
					{sections.map((section, index) => (
						<Card key={section.id} className="gap-3 py-5">
							<CardHeader className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 px-5">
								<span
									aria-hidden="true"
									className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-700"
								>
									{index + 1}
								</span>
								<div className="min-w-0">
									<div className="flex flex-wrap items-center gap-2">
										<CardTitle className="break-words font-semibold">
											{section.title}
										</CardTitle>
										<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
											{getSectionKindLabel(section.kind)}
										</span>
									</div>
									<p className="mt-1 text-xs text-slate-500">
										{getSectionFacts(section)}
									</p>
								</div>
							</CardHeader>
							{section.instructions.trim() && (
								<CardContent className="px-5 pl-[4.75rem]">
									<p className="whitespace-pre-line break-words text-sm leading-6 text-slate-600">
										{section.instructions}
									</p>
								</CardContent>
							)}
						</Card>
					))}
				</div>
			</section>
		</div>
	)
}

export function ExamFacts({ detail }: { detail: StudentExamDetail }) {
	const counts = getExamCounts(detail)
	const version = detail.publishedVersion
	return (
		<div>
			<h2 className="text-lg font-semibold text-slate-950">Exam details</h2>
			<dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
				<Fact
					icon={Clock3}
					label="Duration"
					value={
						version.durationMinutes == null
							? "No time limit"
							: `${version.durationMinutes} min`
					}
				/>
				<Fact
					icon={FileQuestion}
					label="Questions"
					value={String(counts.questionCount)}
				/>
				<Fact icon={Layers3} label="Sections" value={String(counts.sectionCount)} />
				<Fact
					icon={Trophy}
					label="Total points"
					value={formatNumber(version.totalScore)}
				/>
				<Fact
					icon={BookOpen}
					label="Version"
					value={String(version.versionNumber)}
				/>
				<Fact
					icon={CalendarDays}
					label="Published"
					value={formatDate(version.publishedAtUtc, false)}
				/>
			</dl>
		</div>
	)
}

function Fact({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Clock3
	label: string
	value: string
}) {
	return (
		<div className="min-w-0 rounded-lg bg-slate-50 p-3">
			<dt className="flex items-center gap-1.5 text-xs text-slate-500">
				<Icon className="size-3.5" aria-hidden="true" />
				{label}
			</dt>
			<dd className="mt-1 truncate font-medium text-slate-900">{value}</dd>
		</div>
	)
}

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
					<h2
						id="past-attempts-heading"
						className="text-xl font-semibold text-slate-950"
					>
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
					<div className={cn("hidden overflow-hidden rounded-xl border bg-white md:block", isPlaceholderData && "opacity-60")}>
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
					<div className={cn("space-y-3 md:hidden", isPlaceholderData && "opacity-60")}>
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
			<td className="px-4 py-4 text-slate-700">
				{presentation.percentage}
			</td>
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
			<ReviewLink
				attempt={attempt}
				label={presentation.action}
				className="mt-4 w-full"
			/>
		</article>
	)
}

function getAttemptPresentation(attempt: StudentExamAttempt) {
	const status = attempt.status
	if (status === "submitted") {
		return {
			status,
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
		status,
		label: status === "abandoned" ? "Abandoned" : "Unavailable",
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
		<span
			className={cn(
				"inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
				status === "submitted"
					? "bg-emerald-50 text-emerald-700"
					: "bg-amber-50 text-amber-800"
			)}
		>
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

export function formatDate(value: string, includeTime = true) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return "Unavailable"
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		...(includeTime ? { timeStyle: "short" as const } : {}),
	}).format(date)
}
