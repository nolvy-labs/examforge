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
import type { AdminExamTag } from "@/features/exam-classifications/types/exam-classification.types"

interface Props {
	tags: AdminExamTag[]
	selectedIds: string[]
	onChange: (tagIds: string[]) => void
	includeArchived?: boolean
	disabled?: boolean
	maxSelected?: number
	label: string
	showSelected?: boolean
	showTrigger?: boolean
}

export function ExamTagMultiSelect({
	tags,
	selectedIds,
	onChange,
	includeArchived = true,
	disabled,
	maxSelected,
	label,
	showSelected = true,
	showTrigger = true,
}: Props) {
	const [search, setSearch] = useState("")
	const selected = new Set(selectedIds)
	const availableTags = includeArchived
		? tags
		: tags.filter((tag) => !tag.isArchived)
	const filteredTags = availableTags.filter((tag) =>
		`${tag.name} ${tag.slug}`.toLowerCase().includes(search.trim().toLowerCase())
	)
	const tagById = useMemo(
		() => new Map(tags.map((tag) => [tag.id, tag])),
		[tags]
	)
	const selectedTags = selectedIds.map((id) => ({
		id,
		name: tagById.get(id)?.name ?? "Unavailable tag",
		isArchived: tagById.get(id)?.isArchived ?? true,
	}))
	const atLimit = maxSelected !== undefined && selectedIds.length >= maxSelected

	function toggleTag(id: string, checked: boolean) {
		const next = checked
			? Array.from(new Set([...selectedIds, id])).sort()
			: selectedIds.filter((selectedId) => selectedId !== id)
		onChange(next)
	}

	return (
		<div className="space-y-2">
		{showTrigger && <Popover>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant="outline"
						className="w-full justify-between sm:w-auto"
						disabled={disabled}
						aria-label={label}
					/>
				}
			>
				<TagIcon />
				{selectedIds.length
					? `${selectedIds.length} ${selectedIds.length === 1 ? "tag" : "tags"}`
					: "All tags"}
				<CaretDownIcon className="ml-1" />
			</PopoverTrigger>
			<PopoverContent align="start" className="w-80">
				<PopoverHeader>
					<PopoverTitle>{label}</PopoverTitle>
					<PopoverDescription>
						{includeArchived
							? "Archived tags remain available for filtering."
							: `Choose up to ${maxSelected ?? 20} active tags.`}
					</PopoverDescription>
				</PopoverHeader>
				<label htmlFor={`${label.replaceAll(" ", "-").toLowerCase()}-search`} className="sr-only">
					Search tags
				</label>
				<Input
					id={`${label.replaceAll(" ", "-").toLowerCase()}-search`}
					value={search}
					placeholder="Search tags"
					onChange={(event) => setSearch(event.target.value)}
				/>
				<div className="max-h-64 overflow-y-auto border" role="group" aria-label={label}>
					{filteredTags.length ? (
						filteredTags.map((tag) => {
							const checked = selected.has(tag.id)
							return (
								<label
									key={tag.id}
									className="flex cursor-pointer items-center gap-2 border-b px-2 py-2 last:border-b-0 hover:bg-muted/50"
								>
									<Checkbox
										checked={checked}
										disabled={!checked && atLimit}
										onCheckedChange={(next) => toggleTag(tag.id, next)}
									/>
									<span className="min-w-0 flex-1 truncate">{tag.name}</span>
									{tag.isArchived && <Badge variant="outline">Archived</Badge>}
								</label>
							)
						})
					) : (
						<p className="px-2 py-6 text-center text-muted-foreground">
							No tags found.
						</p>
					)}
				</div>
				{selectedIds.length > 0 && (
					<Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
						Clear selected tags
					</Button>
				)}
			</PopoverContent>
		</Popover>}
		{showSelected && selectedTags.length > 0 && (
			<div className="flex flex-wrap gap-1" aria-label="Selected tags">
				{selectedTags.map((tag) => (
					<Badge key={tag.id} variant={tag.isArchived ? "outline" : "secondary"}>
						{tag.name}{tag.isArchived ? " (archived)" : ""}
						<button
							type="button"
							className="ml-0.5 rounded-none outline-none focus-visible:ring-1 focus-visible:ring-ring"
							aria-label={`Remove ${tag.name}`}
							onClick={() => toggleTag(tag.id, false)}
						>
							<XIcon className="size-3" />
						</button>
					</Badge>
				))}
			</div>
		)}
		</div>
	)
}
