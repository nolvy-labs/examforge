"use client"

import { FilePlusIcon, FunnelXIcon } from "@phosphor-icons/react"

import { Button } from "@/components/shadcn/button"
import { Card, CardContent } from "@/components/shadcn/card"

interface Props {
	filtered: boolean
	onClear: () => void
	onCreate: (trigger: HTMLButtonElement) => void
}

export function ExamManagementEmpty({ filtered, onClear, onCreate }: Props) {
	return (
		<Card>
			<CardContent className="flex flex-col items-center px-6 py-16 text-center">
				{filtered ? (
					<FunnelXIcon className="size-9 text-muted-foreground" />
				) : (
					<FilePlusIcon className="size-9 text-muted-foreground" />
				)}
				<h3 className="mt-4 text-base font-semibold">
					{filtered ? "No exams match these filters" : "No exams have been created"}
				</h3>
				<p className="mt-2 max-w-md text-sm text-muted-foreground">
					{filtered
						? "Try a different title, tag, type, or archive status."
						: "Create the first exam to begin managing exam metadata and tags."}
				</p>
				{filtered ? (
					<Button type="button" variant="outline" className="mt-5" onClick={onClear}>
						Clear filters
					</Button>
				) : (
					<Button type="button" className="mt-5" onClick={(event) => onCreate(event.currentTarget)}>
						<FilePlusIcon />
						Create exam
					</Button>
				)}
			</CardContent>
		</Card>
	)
}
