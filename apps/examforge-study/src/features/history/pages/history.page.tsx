"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, LoaderCircle } from "lucide-react"

import { MainHeader } from "@/components/layout/header/header"
import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Card, CardContent } from "@/components/shadcn/card"
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/shadcn/select"
import { Skeleton } from "@/components/shadcn/skeleton"
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/shadcn/table"
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "@/components/shadcn/pagination"
import { useAttempts } from "@/features/attempt/api/attempt.query"
import type { AttemptStatus } from "@/features/attempt/types/attempt.type"
import { cn } from "@/lib/utils"

import { HistoryAttemptItem } from "../components/history-attempt-item"
import {
	getNormalizedHistoryQuery,
	HISTORY_PAGE_SIZES,
	parseHistoryQuery,
	serializeHistoryQuery,
	updateHistoryState,
	type HistoryState,
} from "../model/history-query"

const STATUS_FILTERS: Array<{ label: string; status?: AttemptStatus }> = [
	{ label: "All" },
	{ label: "In progress", status: "in-progress" },
	{ label: "Submitted", status: "submitted" },
	{ label: "Abandoned", status: "abandoned" },
]

export function HistoryPage() {
	const pathname = usePathname()
	const router = useRouter()
	const searchParams = useSearchParams()
	const rawQuery = searchParams.toString()
	const state = useMemo(
		() => parseHistoryQuery(new URLSearchParams(rawQuery)),
		[rawQuery]
	)
	const query = useAttempts({
		...(state.status ? { status: state.status } : {}),
		sort: "created-at-desc",
		page: state.page,
		pageSize: state.pageSize,
	})

	useEffect(() => {
		const normalized = getNormalizedHistoryQuery(new URLSearchParams(rawQuery))
		if (normalized !== rawQuery) {
			router.replace(normalized ? `${pathname}?${normalized}` : pathname, {
				scroll: false,
			})
		}
	}, [pathname, rawQuery, router])

	function href(next: HistoryState) {
		const params = serializeHistoryQuery(next, new URLSearchParams(rawQuery))
		const queryString = params.toString()
		return queryString ? `${pathname}?${queryString}` : pathname
	}

	function navigate(next: HistoryState) {
		router.push(href(next), { scroll: false })
	}

	return (
		<div className="flex min-h-svh flex-col bg-neutral-50">
			<MainHeader />
			<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">Attempt history</h1>
					</div>
					{query.isFetching && query.data ? <span className="flex items-center gap-2 text-xs text-neutral-500" role="status"><LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />Refreshing</span> : null}
				</div>

				<nav aria-label="Attempt status" className="mt-8 flex gap-1 overflow-x-auto border-b">
					{STATUS_FILTERS.map((filter) => {
						const active = filter.status === state.status
						return (
							<Link
								key={filter.label}
								href={href(updateHistoryState(state, { status: filter.status }))}
								className={cn("shrink-0 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-neutral-600 outline-none hover:background focus-visible:ring-2 focus-visible:ring-ring", active && "border-primary text-primary")}
							>
								{filter.label}
							</Link>
						)
					})}
				</nav>

				<div className="mt-6">
					{query.isPending ? <HistorySkeleton /> : query.isError ? (
						<Alert>
							<AlertCircle />
							<AlertDescription>
								<p>We couldn&apos;t load your attempt history.</p>
								<Button type="button" variant="outline" className="mt-3" onClick={() => void query.refetch()}>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : !query.data?.items.length ? (
						<Card>
							<CardContent className="p-10 text-center">
								<h2 className="font-semibold">No attempts on this page</h2>
								<p className="mt-2 text-sm text-neutral-600">Try another status or page.</p>
							</CardContent>
						</Card>
					) : (
						<>
							<Card className="hidden py-0 md:block">
								<Table className="text-left text-sm">
									<TableHeader className="border-b bg-neutral-100 text-xs text-foreground">
										<TableRow>
											<TableHead scope="col" className="h-auto px-4 py-3">Exam</TableHead>
											<TableHead scope="col" className="h-auto px-4 py-3">Status</TableHead>
											<TableHead scope="col" className="h-auto px-4 py-3">Created</TableHead>
											<TableHead scope="col" className="h-auto px-4 py-3">Last updated</TableHead>
											<TableHead scope="col" className="h-auto px-4 py-3">Score / result</TableHead>
											<TableHead scope="col" className="h-auto px-4 py-3 text-right">Action</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody className="divide-y">
										{query.data.items.map((attempt) => <HistoryAttemptItem key={attempt.attemptId} attempt={attempt} variant="table" />)}
									</TableBody>
								</Table>
							</Card>
							<div className="space-y-3 md:hidden">{query.data.items.map((attempt) => <HistoryAttemptItem key={attempt.attemptId} attempt={attempt} variant="card" />)}</div>
						</>
					)}
				</div>

				{query.data ? (
					<div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<label className="flex items-center gap-2 text-sm">Rows per page<Select value={state.pageSize} onValueChange={(value) => { if (value != null) navigate(updateHistoryState(state, { pageSize: value })) }}><SelectTrigger aria-label="Rows per page"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{HISTORY_PAGE_SIZES.map((size) => <SelectItem key={size} value={size}>{size}</SelectItem>)}</SelectGroup></SelectContent></Select></label>
						<Pagination aria-label="History pages" className="sm:mx-0 sm:w-auto">
							<PaginationContent className="w-full justify-between gap-3 sm:w-auto sm:justify-end">
								<PaginationItem>
									<PaginationPrevious
										href={href(updateHistoryState(state, { page: Math.max(1, state.page - 1) }, false))}
										aria-disabled={state.page <= 1}
										tabIndex={state.page <= 1 ? -1 : undefined}
										className={cn(state.page <= 1 && "pointer-events-none opacity-50")}
										onClick={(event) => {
											event.preventDefault()
											if (state.page > 1) navigate(updateHistoryState(state, { page: state.page - 1 }, false))
										}}
									/>
								</PaginationItem>
								<PaginationItem>
									<span className="text-sm text-neutral-600">
										Page {state.page}{query.data.meta.totalPages > 0 ? ` · ${query.data.meta.totalPages} total` : ""}
									</span>
								</PaginationItem>
								<PaginationItem>
									<PaginationNext
										href={href(updateHistoryState(state, { page: state.page + 1 }, false))}
										aria-disabled={!query.data.meta.hasNextPage}
										tabIndex={query.data.meta.hasNextPage ? undefined : -1}
										className={cn(!query.data.meta.hasNextPage && "pointer-events-none opacity-50")}
										onClick={(event) => {
											event.preventDefault()
											if (query.data.meta.hasNextPage) navigate(updateHistoryState(state, { page: state.page + 1 }, false))
										}}
									/>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					</div>
				) : null}
			</main>
		</div>
	)
}

function HistorySkeleton() {
	return <div className="space-y-3" aria-label="Loading attempt history">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-20 w-full" />)}</div>
}
