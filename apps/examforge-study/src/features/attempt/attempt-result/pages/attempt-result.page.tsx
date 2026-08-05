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
import { StartAttemptDialog } from "@/features/exams/exam-detail/components/start-attempt-dialog"
import { flattenAnswerableQuestions } from "../../types/attempt.type"

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
	const startContext = {
		examId: result.detail.examId,
		examSlug: result.detail.exam.slug,
		examTitle: result.detail.exam.title,
		examVersionId: result.detail.examVersionId,
		durationMinutes: result.detail.examVersion.durationMinutes,
		questionCount: flattenAnswerableQuestions(result.detail.sections).length,
		sectionCount: result.detail.sections.length,
		totalScore: result.detail.maximumScore ?? flattenAnswerableQuestions(result.detail.sections)
			.reduce((total, question) => total + question.points, 0),
	}

	return (
		<div className="min-h-svh bg-neutral-50">
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
						isRetakePending={Boolean(result.retake.dialog?.isPending)}
						onRetake={() => result.retake.openDialog("retake")}
					/>
					<AttemptQuestionReview
						sections={result.detail.sections}
						showGrading={result.submitted}
					/>
				</div>
				<StartAttemptDialog detail={startContext} controller={result.retake} />
			</main>
		</div>
	)
}
