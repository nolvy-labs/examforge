"use client"

import { useRef, useState } from "react"
import { ArchiveBoxIcon, ArrowCounterClockwiseIcon, SpinnerGapIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import { useArchiveAdminExamCategoryMutation, useRestoreAdminExamCategoryMutation } from "@/features/exam-classifications/hooks/exam-classification.hook"
import { getClassificationActionErrorMessage } from "@/features/exam-classifications/model/classification-management-error"
import type { AdminExamCategory } from "@/features/exam-classifications/types/exam-classification.types"

interface Props {
	open: boolean
	category: AdminExamCategory
	action: "archive" | "restore"
	restoreFocusTo: HTMLButtonElement | null
	onOpenChange: (open: boolean) => void
}

export function CategoryStatusDialog({ open, category, action, restoreFocusTo, onOpenChange }: Props) {
	const archiveMutation = useArchiveAdminExamCategoryMutation()
	const restoreMutation = useRestoreAdminExamCategoryMutation()
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
			if (action === "archive") await archiveMutation.mutateAsync(category.id)
			else await restoreMutation.mutateAsync(category.id)
			toast.success(`“${category.name}” was ${action === "archive" ? "archived" : "restored"}.`)
			onOpenChange(false)
			window.requestAnimationFrame(() => restoreFocusTo?.focus())
		} catch (mutationError) {
			setError(getClassificationActionErrorMessage(mutationError, "category", action))
		} finally {
			submissionPending.current = false
		}
	}

	return <Dialog open={open} onOpenChange={changeOpen}><DialogContent showCloseButton={!pending}><DialogHeader><DialogTitle>{action === "archive" ? "Archive" : "Restore"} “{category.name}”?</DialogTitle><DialogDescription>{action === "archive" ? "The category will be hidden from active management and student discovery. It can be restored later; related exams and tags are not deleted." : "The category will return to active management. It will only appear in student discovery when its tag rule is valid."}</DialogDescription></DialogHeader>{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}<DialogFooter><DialogClose render={<Button type="button" variant="outline" />} disabled={pending}>Cancel</DialogClose><Button type="button" variant={action === "archive" ? "destructive" : "default"} disabled={pending} onClick={() => void confirm()}>{pending ? <SpinnerGapIcon className="animate-spin" /> : action === "archive" ? <ArchiveBoxIcon /> : <ArrowCounterClockwiseIcon />}{pending ? `${action === "archive" ? "Archiving" : "Restoring"}…` : action === "archive" ? "Archive category" : "Restore category"}</Button></DialogFooter></DialogContent></Dialog>
}
