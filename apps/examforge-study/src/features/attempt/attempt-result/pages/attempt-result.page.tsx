"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { MainHeader } from "@/components/layout/header/header"

import { AttemptQuestionReview } from "../components/attempt-question-review"
import {
	AttemptResultError,
	AttemptResultLoading,
} from "../components/attempt-result-feedback"
import { AttemptResultSummary } from "../components/attempt-result-summary"
import { useAttemptResult } from "../hooks/use-attempt-result"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/shadcn/button"

interface AttemptResultPageProps {
	attemptId: string
}

export function AttemptResultPage({ attemptId }: AttemptResultPageProps) {
	const result = useAttemptResult(attemptId)

	if (result.query.isPending) return <AttemptResultLoading />
	if (result.query.isError || !result.detail) {
		return (
			<AttemptResultError
				error={result.query.error}
				onRetry={() => void result.query.refetch()}
			/>
		)
	}
	if (result.status === "in-progress" && result.query.isFetching) {
		return <AttemptResultLoading />
	}

	const examHref = `/exams/${encodeURIComponent(result.detail.exam.slug)}`

	return (
		<div className="min-h-svh bg-slate-50">
			<MainHeader />
			<main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
				<div className="flex flex-col gap-4 items-start">
					<Link href={examHref} className={cn(buttonVariants({ variant: "link" }), "px-0")}>
						<ArrowLeft />
						Return to exam
					</Link>
					<AttemptResultSummary
						detail={result.detail}
						submitted={result.submitted}
						finishedAt={result.finishedAt}
						elapsedMinutes={result.elapsedMinutes}
						isRetakePending={result.retake.isPending}
						onRetake={result.retake.create}
					/>
					<AttemptQuestionReview
						sections={result.detail.sections}
						showGrading={result.submitted}
					/>
				</div>
			</main>
		</div>
	)
}
