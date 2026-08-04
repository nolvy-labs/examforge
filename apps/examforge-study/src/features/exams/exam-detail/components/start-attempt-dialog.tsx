"use client"

import { LoaderCircle, X } from "lucide-react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Label } from "@/components/shadcn/label"
import { Switch } from "@/components/shadcn/switch"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/shadcn/dialog"

import type { AttemptStartContext, StartAttemptDialogController } from "../hooks/use-start-attempt-dialog"
import { formatNumber } from "../model/exam-detail"

interface Props {
	detail: AttemptStartContext
	controller: StartAttemptDialogController
}

export function StartAttemptDialog({ detail, controller }: Props) {
	const dialog = controller.dialog
	const facts = [
		{ 
			label: "Questions", 
			value: String(detail.questionCount)
		},
		{ 	
			label: "Sections", 
			value: String(detail.sectionCount)
		},
		{
			label: "Duration",
			value: detail.durationMinutes == null ? "No time limit" : `${detail.durationMinutes} min`,
		},
		{
			label: "Total points",
			value: formatNumber(detail.totalScore),
		},
	]

	return (
		<Dialog
			open={dialog !== null}
			onOpenChange={(open) => {
				if (!open) controller.closeDialog()
			}}
		>
			<DialogContent showCloseButton={false} className="p-4">
				<div className="flex items-start justify-between">
					<DialogHeader>
						<DialogTitle className="text-xl">
							{dialog?.mode === "retake" ? "Retake exam?" : "Start exam?"}
						</DialogTitle>
						<DialogDescription>
							A new attempt will be created for {detail.examTitle}.
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

				<div className="flex items-start justify-between gap-4 rounded-md border p-4">
					<div className="space-y-1">
						<Label htmlFor="exam-mode">Exam mode</Label>
						<p className="text-sm text-muted-foreground">
							{detail.durationMinutes == null
								? "Exam mode requires a time limit."
								: dialog?.attemptMode === "exam"
									? "Uses the server-enforced time limit."
									: "No deadline; active time is tracked locally."}
						</p>
					</div>
					<Switch
						id="exam-mode"
						checked={dialog?.attemptMode === "exam"}
						disabled={dialog?.isPending || detail.durationMinutes == null}
						onCheckedChange={(checked) => controller.setAttemptMode(checked ? "exam" : "practice")}
					/>
				</div>
				{dialog?.error && (
					<Alert variant="destructive">
						<AlertDescription>{dialog.error}</AlertDescription>
					</Alert>
				)}
				{dialog?.existingAttemptId && (
					<Button type="button" variant="outline" onClick={controller.continueExisting}>
						Continue existing attempt
					</Button>
				)}

				<DialogFooter>
					<DialogClose
						render={<Button variant="outline" />}
						disabled={dialog?.isPending || Boolean(dialog?.existingAttemptId)}
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
