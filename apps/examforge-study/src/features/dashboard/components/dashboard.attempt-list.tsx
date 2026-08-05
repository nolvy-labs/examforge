"use client"

import { useRef } from "react"
import Link from "next/link"
import { AlertCircle, BookOpen, LoaderCircle, RotateCcw } from "lucide-react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Badge } from "@/components/shadcn/badge"
import { Button, buttonVariants } from "@/components/shadcn/button"
import { Card, CardContent } from "@/components/shadcn/card"
import { Skeleton } from "@/components/shadcn/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/shadcn/table"
import { useInfiniteAttempts } from "@/features/attempt/api/attempt.query"
import {
	deduplicateAttempts,
	formatAttemptSummaryDate,
	formatAttemptSummaryScore,
} from "@/features/attempt/model/attempt-summary"
import type {
	AttemptStatus,
	StudentExamAttempt,
} from "@/features/attempt/types/attempt.type"
import { useAuthSession } from "@/features/auth/stores/auth.store"
interface DashboardAttemptListProps {
	status: Extract<AttemptStatus, "in-progress" | "submitted">
	emptyTitle: string
	emptyDescription: string
}

export function DashboardAttemptList({
	status,
	emptyTitle,
	emptyDescription,
}: DashboardAttemptListProps) {
	const session = useAuthSession()
	const nextPageGate = useRef(false)
	const query = useInfiniteAttempts(
		{ status, sort: "created-at-desc", pageSize: 5 },
		session.status === "authenticated"
	)
	const attempts = deduplicateAttempts(
		(query.data?.pages.flatMap((page) => page.items) ?? []).filter(
			(attempt) => attempt.status === status
		)
	)

	async function loadMore() {
		if (nextPageGate.current || query.isFetchingNextPage || !query.hasNextPage) {
			return
		}
		nextPageGate.current = true
		try {
			await query.fetchNextPage({ cancelRefetch: false })
		} finally {
			nextPageGate.current = false
		}
	}

	if (query.isPending) return <DashboardAttemptListSkeleton />
	if (query.isError && !query.data) {
		return (
			<AttemptError
				message="We couldn't load these attempts."
				onRetry={() => void query.refetch()}
			/>
		)
	}
	if (!attempts.length) {
		return (
			<Card className="items-center border-dashed p-6 text-center">
				<span className="grid size-11 place-items-center rounded-lg bg-neutral-100 text-neutral-600">
					<BookOpen className="size-5" />
				</span>
				<div>
					<h3 className="font-semibold text-neutral-900">{emptyTitle}</h3>
					<p className="mt-1 text-sm text-neutral-600">{emptyDescription}</p>
				</div>
			</Card>
		)
	}

	return (
		<div className="space-y-3">
			<Card className="hidden py-0 md:block">
				<Table className="min-w-3xl text-left text-sm">
					<TableHeader className="border-b bg-neutral-100 text-xs text-neutral-600">
						<TableRow>
							<TableHead scope="col" className="h-auto px-4 py-3 font-medium">Exam</TableHead>
							<TableHead scope="col" className="h-auto px-4 py-3 font-medium">Status</TableHead>
							<TableHead scope="col" className="h-auto px-4 py-3 font-medium">Created</TableHead>
							<TableHead scope="col" className="h-auto px-4 py-3 font-medium">Last updated</TableHead>
								{status === "submitted" && (
									<TableHead scope="col" className="h-auto px-4 py-3 font-medium">Score</TableHead>
								)}
							<TableHead scope="col" className="h-auto px-4 py-3 text-right font-medium">Action</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody className="divide-y">
							{attempts.map((attempt) => (
								<DashboardAttemptTableRow
									key={attempt.attemptId}
									attempt={attempt}
								/>
							))}
					</TableBody>
				</Table>
			</Card>

			<div className="space-y-3 md:hidden">
				{attempts.map((attempt) => (
					<DashboardAttemptCard
						key={attempt.attemptId}
						attempt={attempt}
					/>
				))}
			</div>

			{query.isFetchNextPageError && (
				<AttemptError
					message="The next page couldn't be loaded. Your current attempts are still here."
					onRetry={() => void loadMore()}
				/>
			)}
			{query.hasNextPage ? (
				<div className="flex justify-center">
					<Button type="button" variant="outline" disabled={query.isFetchingNextPage} onClick={() => void loadMore()}>
						{query.isFetchingNextPage ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : null}
						{query.isFetchingNextPage ? "Loading more…" : "Load more"}
					</Button>
				</div>
			) : (
				<p className="text-center text-xs text-neutral-500">You&apos;re all caught up.</p>
			)}
		</div>
	)
}

function getAttemptPresentation(attempt: StudentExamAttempt) {
	const submitted = attempt.status === "submitted"
	return {
		submitted,
		label: submitted ? "Submitted" : "In progress",
		action: submitted ? "Review" : "Continue",
		href: submitted
			? `/attempts/${attempt.attemptId}/result`
			: `/attempts/${attempt.attemptId}`,
		updatedAt: submitted
			? attempt.submittedAtUtc ?? attempt.updatedAtUtc
			: attempt.updatedAtUtc,
	}
}

function AttemptAction({ attempt }: { attempt: StudentExamAttempt }) {
	const presentation = getAttemptPresentation(attempt)
	return (
		<Link
			href={presentation.href}
			aria-label={`${presentation.action} ${attempt.examTitle || "exam"}`}
			className={buttonVariants({
				variant: presentation.submitted ? "outline" : "default",
				size: "sm",
			})}
		>
			{presentation.action}
		</Link>
	)
}

function AttemptStatusBadge({ attempt }: { attempt: StudentExamAttempt }) {
	const presentation = getAttemptPresentation(attempt)
	return (
		<Badge variant={presentation.submitted ? "default" : "secondary"}>
			{presentation.label}
		</Badge>
	)
}

function DashboardAttemptTableRow({ attempt }: { attempt: StudentExamAttempt }) {
	const presentation = getAttemptPresentation(attempt)
	return (
		<TableRow>
			<TableCell className="max-w-72 whitespace-normal px-4 py-4 font-medium text-neutral-950">
				<span className="line-clamp-2" title={attempt.examTitle || "Untitled exam"}>
					{attempt.examTitle || "Untitled exam"}
				</span>
			</TableCell>
			<TableCell className="px-4 py-4"><AttemptStatusBadge attempt={attempt} /></TableCell>
			<TableCell className="whitespace-nowrap px-4 py-4 text-neutral-600">
				{formatAttemptSummaryDate(attempt.createdAtUtc)}
			</TableCell>
			<TableCell className="whitespace-nowrap px-4 py-4 text-neutral-600">
				{formatAttemptSummaryDate(presentation.updatedAt)}
			</TableCell>
			{presentation.submitted && (
				<TableCell className="whitespace-nowrap px-4 py-4">
					{formatAttemptSummaryScore(attempt) ?? "Not available"}
				</TableCell>
			)}
			<TableCell className="px-4 py-4 text-right"><AttemptAction attempt={attempt} /></TableCell>
		</TableRow>
	)
}

function DashboardAttemptCard({ attempt }: { attempt: StudentExamAttempt }) {
	const presentation = getAttemptPresentation(attempt)
	return (
		<Card size="sm">
			<CardContent className="space-y-4">
				<div className="flex items-start justify-between gap-3">
					<h3
						className="min-w-0 truncate font-semibold text-neutral-950"
						title={attempt.examTitle || "Untitled exam"}
					>
						{attempt.examTitle || "Untitled exam"}
					</h3>
					<AttemptStatusBadge attempt={attempt} />
				</div>
				<dl className="grid grid-cols-2 gap-3 text-xs text-neutral-600">
					<div>
						<dt>Created</dt>
						<dd className="mt-1 font-medium text-neutral-900">
							{formatAttemptSummaryDate(attempt.createdAtUtc)}
						</dd>
					</div>
					<div>
						<dt>{presentation.submitted ? "Submitted / updated" : "Last updated"}</dt>
						<dd className="mt-1 font-medium text-neutral-900">
							{formatAttemptSummaryDate(presentation.updatedAt)}
						</dd>
					</div>
					{presentation.submitted && (
						<div className="col-span-2">
							<dt>Score</dt>
							<dd className="mt-1 font-medium text-neutral-900">
								{formatAttemptSummaryScore(attempt) ?? "Not available"}
							</dd>
						</div>
					)}
				</dl>
				<div className="[&>a]:w-full"><AttemptAction attempt={attempt} /></div>
			</CardContent>
		</Card>
	)
}

function AttemptError({ message, onRetry }: { message: string; onRetry: () => void }) {
	return (
		<Alert>
			<AlertCircle />
			<AlertDescription>
				<p>{message}</p>
				<Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
					<RotateCcw /> Try again
				</Button>
			</AlertDescription>
		</Alert>
	)
}

function DashboardAttemptListSkeleton() {
	return (
		<div aria-label="Loading attempts">
			<Card className="hidden py-0 md:block">
				<div className="space-y-1 p-4">
					<Skeleton className="h-10 w-full" />
					{Array.from({ length: 3 }, (_, index) => (
						<Skeleton key={index} className="h-14 w-full" />
					))}
				</div>
			</Card>
			<div className="space-y-3 md:hidden">
				{Array.from({ length: 2 }, (_, index) => (
					<Card key={index} size="sm">
						<CardContent className="space-y-4">
							<Skeleton className="h-5 w-2/3" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-8 w-full" />
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	)
}
