"use client"

import { ArchiveBoxIcon, SpinnerGapIcon } from "@phosphor-icons/react"

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

interface Props {
	open: boolean
	examTitle: string
	pending: boolean
	error: string | null
	onOpenChange: (open: boolean) => void
	onConfirm: () => void
}

export function ArchiveExamDialog({
	open,
	examTitle,
	pending,
	error,
	onOpenChange,
	onConfirm,
}: Props) {
	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!pending) onOpenChange(nextOpen)
			}}
		>
			<DialogContent showCloseButton={!pending}>
				<DialogHeader>
					<DialogTitle>Archive “{examTitle}”?</DialogTitle>
					<DialogDescription>
						The exam will move out of the active list. It can be restored later from the archived view.
					</DialogDescription>
				</DialogHeader>
				{error && (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				<DialogFooter>
					<DialogClose render={<Button type="button" variant="outline" />} disabled={pending}>
						Cancel
					</DialogClose>
					<Button
						type="button"
						variant="destructive"
						disabled={pending}
						onClick={onConfirm}
					>
						{pending ? <SpinnerGapIcon className="animate-spin" /> : <ArchiveBoxIcon />}
						{pending ? "Archiving…" : "Archive exam"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
