"use client"

import { useEffect, useMemo, useState } from "react"
import { LoaderCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Card, CardContent } from "@/components/shadcn/card"
import { useExamAttemptHistory } from "@/features/attempt/api/attempt.query"
import { useAuthSession } from "@/features/auth/stores/auth.store"
import { cn } from "@/lib/utils"

import { ExamAttemptHistoryItem } from "./exam-attempt-history-item"
import { ExamAttemptHistoryPagination } from "./exam-attempt-history-pagination"
import { Skeleton } from "@/components/shadcn/skeleton"
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/shadcn/table"

interface Props {
	examId: string
}

export function ExamAttemptHistory({ examId }: Props) {
	const [pagination, setPagination] = useState({ examId, page: 1 })
	const page = pagination.examId === examId ? pagination.page : 1
	const session = useAuthSession()
	const enabled = useMemo(() => session.status === "authenticated", [session.status])
	
	const query = useExamAttemptHistory(examId, page, enabled)

	useEffect(() => {
		const data = query.data
		if (!data || query.isPlaceholderData) return
		const finalPage = data.meta.totalPages === 0 ? 1 : data.meta.totalPages
		if (page <= finalPage) return

		const timeout = window.setTimeout(() => {
			setPagination({ examId, page: finalPage })
		}, 0)
		return () => window.clearTimeout(timeout)
	}, [examId, page, query.data, query.isPlaceholderData])

	if (!enabled) return null

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 id="past-attempts-heading" className="text-xl font-semibold">
						Past Attempts
					</h2>
				</div>
				{query.isFetching && query.data && (
					<span className="flex items-center gap-2 text-xs text-muted-foreground">
						<LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />
						Refreshing
					</span>
				)}
			</div>

			{query.isPending ? (
				<ExamAttemptHistorySkeleton />
			) : query.isError ? (
				<Alert>
					<AlertDescription>
						<p>We couldn&apos;t load your past attempts.</p>
						<Button
							type="button"
							variant="outline"
							className="mt-3"
							onClick={() => void query.refetch()}
						>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			) : !query.data?.items.length ? (
				<Card>
					<CardContent className="p-8 text-center text-sm text-muted-foreground">
						You have no past attempts for this exam.
					</CardContent>
				</Card>
			) : (
				<>
					<Card
						className={cn(
							"py-0",
							query.isPlaceholderData && "opacity-60"
						)}
					>
						<Table className="hidden text-left text-sm md:table">
							<TableHeader className="border-b bg-muted text-xs text-muted-foreground">
								<TableRow>
									<TableHead scope="col" className="h-auto px-4 py-3 font-medium">
										Started
									</TableHead>
									<TableHead scope="col" className="h-auto px-4 py-3 font-medium">
										Status
									</TableHead>
									<TableHead scope="col" className="h-auto px-4 py-3 font-medium">
										Finished
									</TableHead>
									<TableHead scope="col" className="h-auto px-4 py-3 font-medium">
										Score
									</TableHead>
									<TableHead scope="col" className="h-auto px-4 py-3 font-medium">
										Percentage
									</TableHead>
									<TableHead scope="col" className="h-auto px-4 py-3 text-right font-medium">
										Action
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody className="divide-y">
								{query.data.items.map((attempt) => (
									<ExamAttemptHistoryItem
										key={`row-${attempt.attemptId}`}
										attempt={attempt}
										variant="table"
									/>
								))}
							</TableBody>
						</Table>
					</Card>
					<div className={cn("space-y-3 md:hidden", query.isPlaceholderData && "opacity-60")}>
						{query.data.items.map((attempt) => (
							<ExamAttemptHistoryItem
								key={`card-${attempt.attemptId}`}
								attempt={attempt}
								variant="card"
							/>
						))}
					</div>
					<ExamAttemptHistoryPagination
						data={query.data}
						onPageChange={(nextPage) =>
							setPagination({ examId, page: nextPage })
						}
					/>
				</>
			)}
		</section>
	)
}


export function ExamAttemptHistorySkeleton() {
	return (
		<div className="space-y-3">
			<Skeleton className="h-20 w-full" />
			<Skeleton className="h-20 w-full" />
			<Skeleton className="h-20 w-full" />
		</div>
	)
}
