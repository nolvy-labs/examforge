"use client"

import { useState } from "react"
import { SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/shadcn/button"
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetTrigger,
} from "@/components/shadcn/sheet"

import type { ExamBrowseFiltersViewModel } from "../hooks/use-exam-browse-query"
import { ExamFilterPanel } from "./exam-filter-panel"

interface Props {
	filters: ExamBrowseFiltersViewModel
}

export function ExamFilterSheet({ filters }: Props) {
	const [open, setOpen] = useState(false)
	const [draftCategory, setDraftCategory] = useState(filters.category)
	const [draftTagIds, setDraftTagIds] = useState(filters.tagIds)

	function handleOpenChange(nextOpen: boolean) {
		if (nextOpen) {
			setDraftCategory(filters.category)
			setDraftTagIds(filters.tagIds)
		}
		setOpen(nextOpen)
	}

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetTrigger
				render={<Button type="button" variant="outline" className="lg:hidden" />}
			>
				<SlidersHorizontal />
				Filters{filters.activeCount > 0 ? ` (${filters.activeCount})` : ""}
			</SheetTrigger>
			<SheetContent className="flex flex-col py-4">
				<div className="min-h-0 flex-1 overflow-y-auto px-4">
					<ExamFilterPanel
						data={filters.data}
						idPrefix="mobile"
						category={draftCategory}
						tagIds={draftTagIds}
						onCategoryChange={setDraftCategory}
						onTagChange={(id, checked) =>
							setDraftTagIds((current) =>
								checked
									? Array.from(new Set([...current, id])).sort()
									: current.filter((item) => item !== id)
							)
						}
						onClear={() => {
							setDraftCategory("")
							setDraftTagIds([])
						}}
					/>
				</div>
				<SheetFooter className="grid grid-cols-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							setDraftCategory("")
							setDraftTagIds([])
						}}
					>
						Clear
					</Button>
					<Button
						type="button"
						onClick={() => {
							filters.onApply(draftCategory, draftTagIds)
							setOpen(false)
						}}
					>
						Apply filters
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	)
}
