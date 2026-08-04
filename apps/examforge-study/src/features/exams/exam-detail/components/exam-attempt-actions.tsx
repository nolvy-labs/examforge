"use client"

import Link from "next/link"
import { ArrowRight, RotateCcw } from "lucide-react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button, buttonVariants } from "@/components/shadcn/button"
import { Skeleton } from "@/components/shadcn/skeleton"
import { cn } from "@/lib/utils"

import type { StudentExamDetail } from "../../types/exam.types"
import { useExamAttemptActions } from "../hooks/use-exam-attempt-actions"
import { StartAttemptDialog } from "./start-attempt-dialog"
import { Fragment } from "react"
import { getExamCounts } from "../model/exam-detail"

export function ExamAttemptActions({ detail }: { detail: StudentExamDetail }) {
	const controller = useExamAttemptActions(detail)
	const state = controller.availability
	const counts = getExamCounts(detail)
	const startContext = {
		examId: detail.exam.id,
		examSlug: detail.exam.slug,
		examTitle: detail.exam.title,
		examVersionId: detail.publishedVersion.id,
		durationMinutes: detail.publishedVersion.durationMinutes,
		questionCount: counts.questionCount,
		sectionCount: counts.sectionCount,
		totalScore: detail.publishedVersion.totalScore,
	}
	let content

	switch (state.kind) {
		case "initializing":
			content = (
				<div className="space-y-2">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-4 w-4/5" />
				</div>
			)
			break
		case "sign-in":
			content = (
				<Link
					href={state.href}
					className={cn(buttonVariants({ size: "lg" }), "w-full")}
				>
					Sign in to start
					<ArrowRight />
				</Link>
			)
			break
		case "continue":
			content = (
				<Link
					href={state.href}
					className={cn(buttonVariants({ size: "lg" }), "w-full")}
				>
					Continue Exam
					<ArrowRight />
				</Link>
			)
			break
		case "start":
			content = (
				<Button
					type="button"
					size="lg"
					className="w-full"
					onClick={() => controller.openDialog("start")}
				>
					Start Exam
				</Button>
			)
			break
		case "result":
			content = (
				<div className="space-y-2">
					<Link
						href={state.href}
						className={cn(buttonVariants({ size: "lg" }), "w-full")}
					>
						View Latest Attempt
					</Link>
					<Button
						type="button"
						variant="outline"
						size="lg"
						className="w-full"
						onClick={() => controller.openDialog("retake")}
					>
						<RotateCcw />
						Retake
					</Button>
				</div>
			)
			break
		case "retake":
			content = (
				<Button
					type="button"
					variant="outline"
					size="lg"
					className="w-full"
					onClick={() => controller.openDialog("retake")}
				>
					<RotateCcw />
					Retake
				</Button>
			)
			break
		case "unavailable":
			content = (
				<div className="space-y-3">
					<Alert>
						<AlertDescription>
							This exam is not currently available for a new attempt.
						</AlertDescription>
					</Alert>
					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={controller.retryAvailability}
					>
						Check availability again
					</Button>
				</div>
			)
			break
		case "error":
			content = (
				<div className="space-y-3">
					<p className="text-sm leading-6 text-muted-foreground">
						{state.message}
					</p>
					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={controller.retryAvailability}
					>
						Retry attempt status
					</Button>
				</div>
			)
			break
	}

	return (
		<Fragment>
			{content}
			<StartAttemptDialog detail={startContext} controller={controller} />
		</Fragment>
	)
}
