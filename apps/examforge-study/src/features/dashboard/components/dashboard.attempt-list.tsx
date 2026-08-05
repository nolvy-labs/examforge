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
import { LocaleMessage } from "@/components/locale/locale-message"
import type { LocaleMessageId } from "@/i18n/locale.type"
import { useLocale, useTranslations } from "next-intl"
interface DashboardAttemptListProps {
	status: Extract<AttemptStatus, "in-progress" | "submitted">
	emptyTitle: LocaleMessageId
	emptyDescription: LocaleMessageId
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
				message="dashboard.attemptsError"
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
					<h3 className="font-semibold text-neutral-900"><LocaleMessage messageId={emptyTitle} /></h3>
					<p className="mt-1 text-sm text-neutral-600"><LocaleMessage messageId={emptyDescription} /></p>
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
							<TableHead scope="col" className="h-auto px-4 py-3 font-medium"><LocaleMessage messageId="dashboard.tableExam" /></TableHead>
							<TableHead scope="col" className="h-auto px-4 py-3 font-medium"><LocaleMessage messageId="dashboard.tableStatus" /></TableHead>
							<TableHead scope="col" className="h-auto px-4 py-3 font-medium"><LocaleMessage messageId="dashboard.tableCreated" /></TableHead>
							<TableHead scope="col" className="h-auto px-4 py-3 font-medium"><LocaleMessage messageId="dashboard.tableUpdated" /></TableHead>
								{status === "submitted" && (
									<TableHead scope="col" className="h-auto px-4 py-3 font-medium"><LocaleMessage messageId="dashboard.tableScore" /></TableHead>
								)}
							<TableHead scope="col" className="h-auto px-4 py-3 text-right font-medium"><LocaleMessage messageId="dashboard.tableAction" /></TableHead>
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
					message="dashboard.nextPageError"
					onRetry={() => void loadMore()}
				/>
			)}
			{query.hasNextPage ? (
				<div className="flex justify-center">
					<Button type="button" variant="outline" disabled={query.isFetchingNextPage} onClick={() => void loadMore()}>
						{query.isFetchingNextPage ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : null}
						<LocaleMessage messageId={query.isFetchingNextPage ? "dashboard.loadingMore" : "dashboard.loadMore"} />
					</Button>
				</div>
			) : (
				<p className="text-center text-xs text-neutral-500"><LocaleMessage messageId="dashboard.allCaughtUp" /></p>
			)}
		</div>
	)
}

function getAttemptPresentation(attempt: StudentExamAttempt) {
	const submitted = attempt.status === "submitted"
	return {
		submitted,
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
	const translate = useTranslations("dashboard")
	const action = translate(presentation.submitted ? "reviewAction" : "continueAction")
	return (
		<Link
			href={presentation.href}
			aria-label={`${action} ${attempt.examTitle || translate("examFallback")}`}
			className={buttonVariants({
				variant: presentation.submitted ? "outline" : "default",
				size: "sm",
			})}
		>
			{action}
		</Link>
	)
}

function AttemptStatusBadge({ attempt }: { attempt: StudentExamAttempt }) {
	const presentation = getAttemptPresentation(attempt)
	const translate = useTranslations("attempt")
	return (
		<Badge variant={presentation.submitted ? "default" : "secondary"}>
			{translate(presentation.submitted ? "submitted" : "inProgress")}
		</Badge>
	)
}

function DashboardAttemptTableRow({ attempt }: { attempt: StudentExamAttempt }) {
	const presentation = getAttemptPresentation(attempt)
	const locale = useLocale()
	const translate = useTranslations("dashboard")
	return (
		<TableRow>
			<TableCell className="max-w-72 whitespace-normal px-4 py-4 font-medium text-neutral-950">
				<span className="line-clamp-2" title={attempt.examTitle || translate("untitledExam")}>
					{attempt.examTitle || translate("untitledExam")}
				</span>
			</TableCell>
			<TableCell className="px-4 py-4"><AttemptStatusBadge attempt={attempt} /></TableCell>
			<TableCell className="whitespace-nowrap px-4 py-4 text-neutral-600">
				{formatAttemptSummaryDate(attempt.createdAtUtc, locale)}
			</TableCell>
			<TableCell className="whitespace-nowrap px-4 py-4 text-neutral-600">
				{formatAttemptSummaryDate(presentation.updatedAt, locale)}
			</TableCell>
			{presentation.submitted && (
				<TableCell className="whitespace-nowrap px-4 py-4">
					{formatAttemptSummaryScore(attempt, locale) ?? <LocaleMessage messageId="common.notAvailable" />}
				</TableCell>
			)}
			<TableCell className="px-4 py-4 text-right"><AttemptAction attempt={attempt} /></TableCell>
		</TableRow>
	)
}

function DashboardAttemptCard({ attempt }: { attempt: StudentExamAttempt }) {
	const presentation = getAttemptPresentation(attempt)
	const locale = useLocale()
	const translate = useTranslations("dashboard")
	return (
		<Card size="sm">
			<CardContent className="space-y-4">
				<div className="flex items-start justify-between gap-3">
					<h3
						className="min-w-0 truncate font-semibold text-neutral-950"
						title={attempt.examTitle || translate("untitledExam")}
					>
						{attempt.examTitle || translate("untitledExam")}
					</h3>
					<AttemptStatusBadge attempt={attempt} />
				</div>
				<dl className="grid grid-cols-2 gap-3 text-xs text-neutral-600">
					<div>
						<dt><LocaleMessage messageId="dashboard.tableCreated" /></dt>
						<dd className="mt-1 font-medium text-neutral-900">
							{formatAttemptSummaryDate(attempt.createdAtUtc, locale)}
						</dd>
					</div>
					<div>
						<dt>{translate(presentation.submitted ? "submittedUpdated" : "tableUpdated")}</dt>
						<dd className="mt-1 font-medium text-neutral-900">
							{formatAttemptSummaryDate(presentation.updatedAt, locale)}
						</dd>
					</div>
					{presentation.submitted && (
						<div className="col-span-2">
							<dt><LocaleMessage messageId="dashboard.tableScore" /></dt>
							<dd className="mt-1 font-medium text-neutral-900">
								{formatAttemptSummaryScore(attempt, locale) ?? <LocaleMessage messageId="common.notAvailable" />}
							</dd>
						</div>
					)}
				</dl>
				<div className="[&>a]:w-full"><AttemptAction attempt={attempt} /></div>
			</CardContent>
		</Card>
	)
}

function AttemptError({ message, onRetry }: { message: LocaleMessageId; onRetry: () => void }) {
	return (
		<Alert>
			<AlertCircle />
			<AlertDescription>
				<p><LocaleMessage messageId={message} /></p>
				<Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
					<RotateCcw /> <LocaleMessage messageId="common.retry" />
				</Button>
			</AlertDescription>
		</Alert>
	)
}

function DashboardAttemptListSkeleton() {
	return (
		<div aria-label={useTranslations("dashboard")("loadingAttempts")}>
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
