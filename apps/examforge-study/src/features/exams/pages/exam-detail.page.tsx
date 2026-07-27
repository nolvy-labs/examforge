"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, LoaderCircle } from "lucide-react"

import { MainHeader } from "@/components/layout/header/header"
import { Button, buttonVariants } from "@/components/shadcn/button"
import { useAuthStore } from "@/features/auth/stores/auth.store"
import { ApiError } from "@/lib/api/api.error"
import { cn } from "@/lib/utils"

import { ExamAttemptAction } from "../components/exam-attempt.action"
import {
	AttemptHistory,
	ExamBody,
	ExamFacts,
	ExamOverview,
} from "../components/exam-detail.content"
import {
	useActiveExamAttempt,
	useExamAttemptHistory,
	useStudentExamDetail,
} from "../hooks/exam-detail.hook"

export function ExamDetailPage({ slug }: { slug: string }) {
	const [historyPage, setHistoryPage] = useState(1)
	const isAuthInitialized = useAuthStore((state) => state.isInitialized)
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
	const detailQuery = useStudentExamDetail(slug)
	const examId = detailQuery.data?.exam.id ?? ""
	const privateEnabled = Boolean(
		isAuthInitialized && isAuthenticated && detailQuery.isSuccess && examId
	)
	const activeQuery = useActiveExamAttempt(examId, privateEnabled)
	const latestHistoryQuery = useExamAttemptHistory(examId, 1, privateEnabled)
	const historyQuery = useExamAttemptHistory(
		examId,
		historyPage,
		privateEnabled
	)

	useEffect(() => {
		const timeout = window.setTimeout(() => setHistoryPage(1), 0)
		return () => window.clearTimeout(timeout)
	}, [examId])

	useEffect(() => {
		if (detailQuery.data) {
			document.title = `${detailQuery.data.exam.title} | ExamForge Study`
		}
	}, [detailQuery.data])

	useEffect(() => {
		const data = historyQuery.data
		if (!data || historyQuery.isPlaceholderData) return
		const finalPage = data.meta.totalPages === 0 ? 1 : data.meta.totalPages
		if (historyPage > finalPage) {
			const timeout = window.setTimeout(() => setHistoryPage(finalPage), 0)
			return () => window.clearTimeout(timeout)
		}
	}, [historyPage, historyQuery.data, historyQuery.isPlaceholderData])

	function refreshAttemptState() {
		void activeQuery.refetch()
		void latestHistoryQuery.refetch()
		if (historyPage !== 1) void historyQuery.refetch()
	}

	if (detailQuery.isPending) {
		return (
			<div className="flex min-h-svh flex-col bg-slate-50">
				<MainHeader />
				<ExamDetailSkeleton />
			</div>
		)
	}

	if (detailQuery.isError) {
		const notFound =
			detailQuery.error instanceof ApiError && detailQuery.error.status === 404
		return (
			<div className="flex min-h-svh flex-col bg-slate-50">
				<MainHeader />
				<DetailError
					notFound={notFound}
					onRetry={() => void detailQuery.refetch()}
				/>
			</div>
		)
	}

	const detail = detailQuery.data
	return (
		<div className="flex min-h-svh flex-col bg-slate-50">
			<MainHeader />
			<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
				<Link
					href="/exams"
					className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
				>
					<ArrowLeft className="size-4" aria-hidden="true" />
					Back to Browse Exams
				</Link>

				<div className="mt-6">
					<ExamOverview detail={detail} />
				</div>

				{detailQuery.isFetching && (
					<p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
						<LoaderCircle
							className="size-3.5 animate-spin motion-reduce:animate-none"
							aria-hidden="true"
						/>
						Refreshing exam details
					</p>
				)}

				<div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
					<div className="order-2 min-w-0 space-y-10 lg:order-1">
						<ExamBody detail={detail} />
						{isAuthInitialized && isAuthenticated && (
							<AttemptHistory
								data={historyQuery.data}
								isPending={historyQuery.isPending}
								isError={historyQuery.isError}
								isFetching={historyQuery.isFetching}
								isPlaceholderData={historyQuery.isPlaceholderData}
								onRetry={() => void historyQuery.refetch()}
								onPageChange={setHistoryPage}
							/>
						)}
					</div>

					<aside
						aria-label="Exam facts and attempt actions"
						className="order-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:order-2 lg:sticky lg:top-6"
					>
						<ExamFacts detail={detail} />
						<div className="my-5 border-t border-slate-200" />
						<ExamAttemptAction
							detail={detail}
							isAuthInitialized={isAuthInitialized}
							isAuthenticated={isAuthenticated}
							activeData={activeQuery.data}
							latestData={latestHistoryQuery.data}
							isActivePending={activeQuery.isPending}
							isLatestPending={latestHistoryQuery.isPending}
							isActiveError={activeQuery.isError}
							isLatestError={latestHistoryQuery.isError}
							onRetryActive={() => void activeQuery.refetch()}
							onRetryLatest={() => void latestHistoryQuery.refetch()}
							onRefreshAttemptState={refreshAttemptState}
							onRefreshDetail={() => void detailQuery.refetch()}
						/>
					</aside>
				</div>
			</main>
		</div>
	)
}

function ExamDetailSkeleton() {
	return (
		<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
			<div aria-hidden="true" className="animate-pulse space-y-5 motion-reduce:animate-none">
				<div className="h-5 w-40 rounded bg-slate-200" />
				<div className="h-7 w-24 rounded-full bg-slate-200" />
				<div className="h-10 w-full max-w-2xl rounded bg-slate-200" />
				<div className="h-5 w-full max-w-3xl rounded bg-slate-100" />
				<div className="grid gap-8 pt-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
					<div className="space-y-4">
						<div className="h-44 rounded-2xl bg-slate-200" />
						<div className="h-64 rounded-2xl bg-slate-200" />
					</div>
					<div className="h-72 rounded-2xl bg-slate-200" />
				</div>
			</div>
			<p className="sr-only">Loading exam details…</p>
		</main>
	)
}

function DetailError({
	notFound,
	onRetry,
}: {
	notFound: boolean
	onRetry: () => void
}) {
	return (
		<main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-16 sm:px-6">
			<div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
				<h1 className="text-2xl font-semibold text-slate-950">
					{notFound ? "Exam unavailable" : "We couldn’t load this exam"}
				</h1>
				<p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
					{notFound
						? "This exam may not exist or may no longer have a published version."
						: "The exam service is temporarily unavailable. You can try again without losing this URL."}
				</p>
				<div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
					{!notFound && (
						<Button type="button" onClick={onRetry}>
							Try again
						</Button>
					)}
					<Link
						href="/exams"
						className={cn(buttonVariants({ variant: "outline" }))}
					>
						Back to Browse Exams
					</Link>
				</div>
			</div>
		</main>
	)
}
