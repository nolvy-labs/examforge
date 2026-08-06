"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import {
	ArchiveBoxIcon,
	ArrowCounterClockwiseIcon,
	ChartBarIcon,
	DotsThreeIcon,
	SpinnerGapIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/shadcn/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu"
import { ApiError } from "@/lib/api/api.error"

import type { AdminExamSummary } from "../../types/exam.types"
import { getExamActionErrorMessage } from "../model/exam-management-error"
import { ArchiveExamDialog } from "./archive-exam-dialog"

interface Props {
	exam: AdminExamSummary
	isArchiving: boolean
	isRestoring: boolean
	onArchive: (id: string) => Promise<void>
	onRestore: (id: string) => Promise<void>
	onRefresh: () => void
	onOpenDetails: (exam: AdminExamSummary) => void
	onOpenVersions: (exam: AdminExamSummary) => void
}

export function ExamRowActions({
	exam,
	isArchiving,
	isRestoring,
	onArchive,
	onRestore,
	onRefresh,
	onOpenDetails,
	onOpenVersions,
}: Props) {
	const triggerRef = useRef<HTMLButtonElement>(null)
	const [archiveOpen, setArchiveOpen] = useState(false)
	const [archiveError, setArchiveError] = useState<string | null>(null)

	function restoreFocus() {
		window.requestAnimationFrame(() => triggerRef.current?.focus())
	}

	function changeArchiveOpen(open: boolean) {
		setArchiveOpen(open)
		if (open) setArchiveError(null)
		else restoreFocus()
	}

	async function confirmArchive() {
		if (isArchiving) return
		setArchiveError(null)

		try {
			await onArchive(exam.id)
			setArchiveOpen(false)
			toast.success(`“${exam.title}” was archived.`)
			restoreFocus()
		} catch (error) {
			const message = getExamActionErrorMessage(error, "archive")
			setArchiveError(message)
			toast.error(message)
			if (error instanceof ApiError && error.code === "not-found") onRefresh()
		}
	}

	async function restoreExam() {
		if (isRestoring) return

		try {
			await onRestore(exam.id)
			toast.success(`“${exam.title}” was restored.`)
		} catch (error) {
			toast.error(getExamActionErrorMessage(error, "restore"))
			if (error instanceof ApiError && error.code === "not-found") onRefresh()
		}
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							ref={triggerRef}
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label={`Actions for ${exam.title}`}
						/>
					}
				>
					<DotsThreeIcon weight="bold" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-44">
					<DropdownMenuGroup>
					<DropdownMenuLabel>{exam.title}</DropdownMenuLabel>
					<DropdownMenuItem onClick={() => onOpenDetails(exam)}>Details</DropdownMenuItem>
					<DropdownMenuItem onClick={() => onOpenVersions(exam)}>Version Control</DropdownMenuItem>
					<DropdownMenuItem render={<Link href={`/exams/${exam.id}/attempts`} />}>
						<ChartBarIcon />
						Attempt results
					</DropdownMenuItem>
					{exam.isArchived ? (
						<DropdownMenuItem disabled={isRestoring} onClick={() => void restoreExam()}>
							{isRestoring ? <SpinnerGapIcon className="animate-spin" /> : <ArrowCounterClockwiseIcon />}
							{isRestoring ? "Restoring…" : "Restore"}
						</DropdownMenuItem>
					) : (
						<DropdownMenuItem
							variant="destructive"
							disabled={isArchiving}
							onClick={() => changeArchiveOpen(true)}
						>
							{isArchiving ? <SpinnerGapIcon className="animate-spin" /> : <ArchiveBoxIcon />}
							{isArchiving ? "Archiving…" : "Archive"}
						</DropdownMenuItem>
					)}
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>

			<ArchiveExamDialog
				open={archiveOpen}
				examTitle={exam.title}
				pending={isArchiving}
				error={archiveError}
				onOpenChange={changeArchiveOpen}
				onConfirm={() => void confirmArchive()}
			/>
		</>
	)
}
