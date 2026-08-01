"use client"

import { useMemo, useState } from "react"
import { CaretDownIcon, TagIcon, XIcon } from "@phosphor-icons/react"

import { Badge } from "@/components/shadcn/badge"
import { Button } from "@/components/shadcn/button"
import { Checkbox } from "@/components/shadcn/checkbox"
import { Input } from "@/components/shadcn/input"
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/shadcn/popover"
import type {
	AdminExamCategoryTag,
	AdminExamTag,
} from "@/features/exam-classifications/types/exam-classification.types"

interface Props {
	tags: AdminExamTag[]
	originalTags?: readonly AdminExamCategoryTag[]
	selectedIds: string[]
	onChange: (ids: string[]) => void
	disabled?: boolean
}

export function ClassificationTagMultiSelect({
	tags,
	originalTags = [],
	selectedIds,
	onChange,
	disabled,
}: Props) {
	const [search, setSearch] = useState("")
	const selected = new Set(selectedIds)
	const tagById = useMemo(
		() => new Map(tags.map((tag) => [tag.id, tag])),
		[tags]
	)
	const originalById = useMemo(
		() => new Map(originalTags.map((tag) => [tag.id, tag])),
		[originalTags]
	)
	const activeTags = tags.filter((tag) => !tag.isArchived)
	const filtered = activeTags.filter((tag) =>
		`${tag.name} ${tag.slug}`
			.toLocaleLowerCase("en-US")
			.includes(search.trim().toLocaleLowerCase("en-US"))
	)
	const selectedTags = selectedIds.map((id) => {
		const full = tagById.get(id)
		const original = originalById.get(id)
		return {
			id,
			name: full?.name ?? original?.name ?? "Unavailable tag",
			status: full ? (full.isArchived ? "archived" : "active") : "unavailable",
		}
	})

	function toggle(id: string, checked: boolean) {
		onChange(
			checked
				? Array.from(new Set([...selectedIds, id])).sort()
				: selectedIds.filter((selectedId) => selectedId !== id)
		)
	}

	return (
		<div className="space-y-2">
			<Popover>
				<PopoverTrigger
					render={
						<Button
							type="button"
							variant="outline"
							className="w-full justify-between"
							disabled={disabled}
							aria-label="Select active category tags"
						/>
					}
				>
					<TagIcon />
					{selectedIds.length
						? `${selectedIds.length} ${selectedIds.length === 1 ? "tag" : "tags"}`
						: "Select tags"}
					<CaretDownIcon />
				</PopoverTrigger>
				<PopoverContent align="start" className="w-80">
					<PopoverHeader>
						<PopoverTitle>Associated tags</PopoverTitle>
						<PopoverDescription>
							Only active tags can be newly selected.
						</PopoverDescription>
					</PopoverHeader>
					<label htmlFor="category-tag-search" className="sr-only">Search active tags</label>
					<Input id="category-tag-search" value={search} placeholder="Search active tags" onChange={(event) => setSearch(event.target.value)} />
					<div className="max-h-64 overflow-y-auto border" role="group" aria-label="Active category tags">
						{filtered.length ? filtered.map((tag) => (
							<label key={tag.id} className="flex cursor-pointer items-center gap-2 border-b px-2 py-2 last:border-b-0 hover:bg-muted/50">
								<Checkbox checked={selected.has(tag.id)} onCheckedChange={(checked) => toggle(tag.id, checked)} />
								<span className="min-w-0 flex-1 truncate">{tag.name}</span>
							</label>
						)) : <p className="px-2 py-6 text-center text-muted-foreground">No active tags found.</p>}
					</div>
				</PopoverContent>
			</Popover>

			{selectedTags.length > 0 && (
				<div className="flex flex-wrap gap-1" aria-label="Selected category tags">
					{selectedTags.map((tag) => (
						<Badge key={tag.id} variant={tag.status === "active" ? "secondary" : "outline"}>
							{tag.name}{tag.status === "archived" ? " (archived)" : tag.status === "unavailable" ? " (unavailable)" : ""}
							<button type="button" className="ml-0.5 rounded-none outline-none focus-visible:ring-1 focus-visible:ring-ring" aria-label={`Remove ${tag.name}`} onClick={() => toggle(tag.id, false)}>
								<XIcon className="size-3" />
							</button>
						</Badge>
					))}
				</div>
			)}
		</div>
	)
}
