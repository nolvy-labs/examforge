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
import { LocaleMessage } from "@/components/locale/locale-message"
import { useLocale, useTranslations } from "next-intl"
import { localizeError } from "@/features/shared/errors/localized-error"

interface Props {
	detail: AttemptStartContext
	controller: StartAttemptDialogController
}

export function StartAttemptDialog({ detail, controller }: Props) {
	const locale = useLocale()
	const translate = useTranslations("exams")
	const translateErrors = useTranslations("errors")
	const dialog = controller.dialog
	const facts = [
		{ 
			label: translate("questions", { count: detail.questionCount }),
			value: new Intl.NumberFormat(locale).format(detail.questionCount)
		},
		{ 	
			label: translate("sections", { count: detail.sectionCount }),
			value: new Intl.NumberFormat(locale).format(detail.sectionCount)
		},
		{
			label: translate("duration"),
			value: detail.durationMinutes == null ? translate("noTimeLimit") : translate("minutes", { count: detail.durationMinutes }),
		},
		{
			label: translate("totalScore"),
			value: formatNumber(detail.totalScore, locale),
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
							<LocaleMessage messageId={dialog?.mode === "retake" ? "exams.retakeDialogTitle" : "exams.startDialogTitle"} />
						</DialogTitle>
						<DialogDescription>
							<LocaleMessage messageId="exams.newAttemptDescription" values={{ title: detail.examTitle }} />
						</DialogDescription>
					</DialogHeader>
					<DialogClose
						render={<Button variant="ghost" size="icon-sm" />}
						disabled={dialog?.isPending}
					>
						<X />
					</DialogClose>
				</div>

				<dl className="grid grid-cols-2 gap-3 rounded-md bg-neutral-100 p-4 text-sm">
					{facts.map((fact) => (
						<div key={fact.label}>
							<dt className="text-xs text-muted-foreground">{fact.label}</dt>
							<dd className="mt-1 font-medium">{fact.value}</dd>
						</div>
					))}
				</dl>

				<div className="flex items-start justify-between gap-4 rounded-md border p-4">
					<div className="space-y-1">
						<Label htmlFor="exam-mode"><LocaleMessage messageId="exams.examMode" /></Label>
						<p className="text-sm text-warning">
							<LocaleMessage messageId="exams.modeDisabled" />
						</p>
					</div>
					<Switch
						id="exam-mode"
						checked={dialog?.attemptMode === "exam"}
						// disabled={dialog?.isPending || detail.durationMinutes == null}
						disabled={true} // Disabled for now
						onCheckedChange={(checked) => controller.setAttemptMode(checked ? "exam" : "practice")}
					/>
				</div>
				{dialog && Boolean(dialog.error) && (
					<Alert variant="destructive">
						<AlertDescription>{localizeError(dialog.error, translateErrors)}</AlertDescription>
					</Alert>
				)}
				{dialog?.existingAttemptId && (
					<Button type="button" variant="outline" onClick={controller.continueExisting}>
						<LocaleMessage messageId="exams.continueExisting" />
					</Button>
				)}

				<DialogFooter>
					<DialogClose
						render={<Button variant="outline" />}
						disabled={dialog?.isPending || Boolean(dialog?.existingAttemptId)}
					>
						<LocaleMessage messageId="common.cancel" />
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
							? translate("creatingAttempt")
							: dialog?.mode === "retake"
								? translate("createRetake")
								: translate("startNow")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
