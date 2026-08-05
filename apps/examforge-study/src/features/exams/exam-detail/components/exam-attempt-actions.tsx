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
import { LocaleMessage } from "@/components/locale/locale-message"

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
					<LocaleMessage messageId="exams.signInToStart" />
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
					<LocaleMessage messageId="exams.continueAttempt" />
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
					<LocaleMessage messageId="exams.startAttempt" />
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
						<LocaleMessage messageId="exams.viewLatestAttempt" />
					</Link>
					<Button
						type="button"
						variant="outline"
						size="lg"
						className="w-full"
						onClick={() => controller.openDialog("retake")}
					>
						<RotateCcw />
						<LocaleMessage messageId="exams.retakeExam" />
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
					<LocaleMessage messageId="exams.retakeExam" />
				</Button>
			)
			break
		case "unavailable":
			content = (
				<div className="space-y-3">
					<Alert>
						<AlertDescription>
							<LocaleMessage messageId="exams.newAttemptUnavailable" />
						</AlertDescription>
					</Alert>
					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={controller.retryAvailability}
					>
						<LocaleMessage messageId="exams.checkAgain" />
					</Button>
				</div>
			)
			break
		case "error":
			content = (
				<div className="space-y-3">
					<p className="text-sm leading-6 text-muted-foreground">
						<LocaleMessage messageId={`exams.${state.messageKey}`} />
					</p>
					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={controller.retryAvailability}
					>
						<LocaleMessage messageId="exams.retryStatus" />
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
