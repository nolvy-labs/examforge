"use client"

import { useRef, useState } from "react"
import { ArchiveBoxIcon, ArrowCounterClockwiseIcon, SpinnerGapIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import { useArchiveAdminExamTagMutation, useRestoreAdminExamTagMutation } from "@/features/exam-classifications/hooks/exam-classification.hook"
import { getClassificationActionErrorMessage } from "@/features/exam-classifications/model/classification-management-error"
import type { AdminExamTag } from "@/features/exam-classifications/types/exam-classification.types"

interface Props {
	open: boolean
	tag: AdminExamTag
	action: "archive" | "restore"
	restoreFocusTo: HTMLButtonElement | null
	onOpenChange: (open: boolean) => void
}

export function TagStatusDialog({ open, tag, action, restoreFocusTo, onOpenChange }: Props) {
	const archiveMutation = useArchiveAdminExamTagMutation()
	const restoreMutation = useRestoreAdminExamTagMutation()
	const [error, setError] = useState<string | null>(null)
	const submissionPending = useRef(false)
	const pending = archiveMutation.isPending || restoreMutation.isPending

	function changeOpen(next: boolean) {
		if (pending || submissionPending.current) return
		onOpenChange(next)
		if (!next) window.requestAnimationFrame(() => restoreFocusTo?.focus())
	}

	async function confirm() {
		if (pending || submissionPending.current) return
		submissionPending.current = true
		setError(null)
		try {
			if (action === "archive") await archiveMutation.mutateAsync(tag.id)
			else await restoreMutation.mutateAsync(tag.id)
			toast.success(`“${tag.name}” was ${action === "archive" ? "archived" : "restored"}.`)
			onOpenChange(false)
			window.requestAnimationFrame(() => restoreFocusTo?.focus())
		} catch (mutationError) {
			setError(getClassificationActionErrorMessage(mutationError, "tag", action))
		} finally {
			submissionPending.current = false
		}
	}

	return <Dialog open={open} onOpenChange={changeOpen}><DialogContent showCloseButton={!pending}><DialogHeader><DialogTitle>{action === "archive" ? "Archive" : "Restore"} “{tag.name}”?</DialogTitle><DialogDescription>{action === "archive" ? "The tag will become unavailable for new selections. Exams and categories that currently use it will not be deleted." : "The tag will become available for classification and new selections again."}</DialogDescription></DialogHeader>{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}<DialogFooter><DialogClose render={<Button type="button" variant="outline" />} disabled={pending}>Cancel</DialogClose><Button type="button" variant={action === "archive" ? "destructive" : "default"} disabled={pending} onClick={() => void confirm()}>{pending ? <SpinnerGapIcon className="animate-spin" /> : action === "archive" ? <ArchiveBoxIcon /> : <ArrowCounterClockwiseIcon />}{pending ? `${action === "archive" ? "Archiving" : "Restoring"}…` : action === "archive" ? "Archive tag" : "Restore tag"}</Button></DialogFooter></DialogContent></Dialog>
}
