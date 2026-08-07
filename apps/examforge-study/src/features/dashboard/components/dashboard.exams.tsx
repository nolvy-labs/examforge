"use client"

import { ChevronsRight } from "lucide-react"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/shadcn/button"
import ExamCard from "@/features/exams/components/exam-card"
import { LocaleMessage } from "@/components/locale/locale-message"
import { useDashboardRecommendedExams } from "../api/dashboard-exams.query"
import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/shadcn/card"
import { Skeleton } from "@/components/shadcn/skeleton"

export function DashboardExams() {
	const exams = useDashboardRecommendedExams()

	return (
		<section className="flex flex-col gap-4" aria-labelledby="exams-heading">
			<div>
				<div className="flex justify-between">
					<h2 id="exams-heading" className="text-xl font-semibold tracking-tight text-neutral-950">
						<LocaleMessage messageId="dashboard.recommendedExams" />
					</h2>
					<Link
						href={"/exams"}
						className={cn(
							buttonVariants({ variant: "link" }),
							"text-sm h-fit"
						)}
					>
						<LocaleMessage messageId="dashboard.viewAllExams" />
						<ChevronsRight />
					</Link>
				</div>
			</div>
			{exams.isPending ? (
				<DashboardExamSkeletons />
			) : exams.isError ? (
				<DashboardExamError onRetry={() => void exams.refetch()} />
			) : exams.data.items.length ? (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					{exams.data.items.slice(0, 4).map((exam) => (
						<ExamCard key={exam.id} exam={exam} />
					))}
				</div>
			) : (
				<DashboardExamEmpty />
			)}
		</section>
	)
}

export function DashboardExamSkeletons() {
	return (
		<>
			<span className="sr-only" role="status"><LocaleMessage messageId="dashboard.loadingRecommendedExams" /></span>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
				{Array.from({ length: 4 }, (_, index) => (
					<Card key={index} className="h-full">
						<CardHeader className="space-y-3">
							<Skeleton className="h-6 w-4/5" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-5/6" />
							<Skeleton className="h-4 w-3/5" />
						</CardHeader>
						<CardContent className="space-y-4">
							<Skeleton className="h-6 w-28" />
							<Skeleton className="h-20 w-full" />
						</CardContent>
						<CardFooter><Skeleton className="h-9 w-full" /></CardFooter>
					</Card>
				))}
			</div>
		</>
	)
}

export function DashboardExamError({ onRetry }: { onRetry: () => void }) {
	return (
		<Alert>
			<AlertTitle><LocaleMessage messageId="dashboard.recommendedExamsErrorTitle" /></AlertTitle>
			<AlertDescription>
				<p><LocaleMessage messageId="dashboard.recommendedExamsErrorDescription" /></p>
				<Button type="button" className="mt-4" onClick={onRetry}>
					<LocaleMessage messageId="common.retry" />
				</Button>
			</AlertDescription>
		</Alert>
	)
}

export function DashboardExamEmpty() {
	return (
		<Card>
			<CardContent className="px-6 py-12 text-center">
				<h3 className="text-lg font-semibold"><LocaleMessage messageId="dashboard.recommendedExamsEmptyTitle" /></h3>
				<p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
					<LocaleMessage messageId="dashboard.recommendedExamsEmptyDescription" />
				</p>
			</CardContent>
		</Card>
	)
}
