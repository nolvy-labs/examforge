"use client"

import { PlusIcon } from "@phosphor-icons/react"

import { Button } from "@/components/shadcn/button"

interface Props {
	totalItems?: number
	onCreate: (trigger: HTMLButtonElement) => void
}

export function ExamManagementHeader({ totalItems, onCreate }: Props) {
	return (
		<header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
					Content operations
				</p>
				<h1 className="mt-1 text-2xl font-semibold tracking-tight">
					Exam Management
				</h1>
				<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
					Create, find, archive, and restore exams without changing their content.
				</p>
				{totalItems !== undefined && (
					<p className="mt-2 text-xs text-muted-foreground" role="status">
						{totalItems.toLocaleString()} matching {totalItems === 1 ? "exam" : "exams"}
					</p>
				)}
			</div>
			<Button
				type="button"
				size="lg"
				onClick={(event) => onCreate(event.currentTarget)}
			>
				<PlusIcon data-icon="inline-start" />
				Create exam
			</Button>
		</header>
	)
}
