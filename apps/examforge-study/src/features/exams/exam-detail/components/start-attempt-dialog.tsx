"use client"

import { LoaderCircle, X } from "lucide-react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/shadcn/dialog"

import type { StudentExamDetail } from "../../types/exam.types"
import type { ExamAttemptActionsController } from "../hooks/use-exam-attempt-actions"
import { formatNumber, getExamCounts } from "../model/exam-detail"

interface Props {
	detail: StudentExamDetail
	controller: ExamAttemptActionsController
}

export function StartAttemptDialog({ detail, controller }: Props) {
	const dialog = controller.dialog
	const counts = getExamCounts(detail)
	const facts = [
		{ 
			label: "Questions", 
			value: String(counts.questionCount) 
		},
		{ 	
			label: "Sections", 
			value: String(counts.sectionCount) 
		},
		{
			label: "Duration",
			value: detail.publishedVersion.durationMinutes == null ? "No time limit" : `${detail.publishedVersion.durationMinutes} min`,
		},
		{
			label: "Total points",
			value: formatNumber(detail.publishedVersion.totalScore),
		},
	]

	return (
		<Dialog
			open={dialog !== null}
			onOpenChange={(open) => {
				if (!open) controller.closeDialog()
			}}
		>
			<DialogContent showCloseButton={false}>
				<div className="flex items-start justify-between gap-4">
					<DialogHeader>
						<DialogTitle>
							{dialog?.mode === "retake" ? "Retake exam?" : "Start exam?"}
						</DialogTitle>
						<DialogDescription>
							A new attempt will be created for {detail.exam.title}.
						</DialogDescription>
					</DialogHeader>
					<DialogClose
						render={<Button variant="ghost" size="icon-sm" />}
						disabled={dialog?.isPending}
					>
						<X />
					</DialogClose>
				</div>

				<dl className="grid grid-cols-2 gap-3 rounded-md bg-muted p-4 text-sm">
					{facts.map((fact) => (
						<div key={fact.label}>
							<dt className="text-xs text-muted-foreground">{fact.label}</dt>
							<dd className="mt-1 font-medium">{fact.value}</dd>
						</div>
					))}
				</dl>

				{detail.publishedVersion.durationMinutes != null && (
					<Alert>
						<AlertDescription>
							The timed attempt begins immediately after it is created.
						</AlertDescription>
					</Alert>
				)}
				{dialog?.error && (
					<Alert variant="destructive">
						<AlertDescription>{dialog.error}</AlertDescription>
					</Alert>
				)}

				<DialogFooter>
					<DialogClose
						render={<Button variant="outline" />}
						disabled={dialog?.isPending}
					>
						Cancel
					</DialogClose>
					<Button
						type="button"
						disabled={dialog?.isPending}
						onClick={controller.confirmDialog}
					>
						{dialog?.isPending && (
							<LoaderCircle className="animate-spin motion-reduce:animate-none" />
						)}
						{dialog?.isPending
							? "Creating attempt…"
							: dialog?.mode === "retake"
								? "Create retake"
								: "Start now"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
