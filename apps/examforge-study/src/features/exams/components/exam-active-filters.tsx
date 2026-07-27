"use client"

import { X } from "lucide-react"

import { Button } from "@/components/shadcn/button"

export interface ActiveExamTag {
	id: string
	name: string
}

export function ExamActiveFilters({
	search,
	categoryName,
	tags,
	onClearSearch,
	onClearCategory,
	onRemoveTag,
	onClearAll,
}: {
	search: string
	categoryName?: string
	tags: ActiveExamTag[]
	onClearSearch: () => void
	onClearCategory: () => void
	onRemoveTag: (id: string) => void
	onClearAll: () => void
}) {
	if (!search && !categoryName && tags.length === 0) return null

	return (
		<div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
			{search && (
				<FilterChip label={`Title: ${search}`} onRemove={onClearSearch} />
			)}
			{categoryName && (
				<FilterChip label={categoryName} onRemove={onClearCategory} />
			)}
			{tags.map((tag) => (
				<FilterChip
					key={tag.id}
					label={tag.name}
					onRemove={() => onRemoveTag(tag.id)}
				/>
			))}
			<Button type="button" variant="link" size="sm" onClick={onClearAll}>
				Clear all
			</Button>
		</div>
	)
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
	return (
		<span className="inline-flex max-w-full items-center gap-1 rounded-full bg-indigo-50 py-1 pl-3 pr-1 text-sm text-indigo-800">
			<span className="truncate">{label}</span>
			<button
				type="button"
				aria-label={`Remove ${label} filter`}
				className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
				onClick={onRemove}
			>
				<X className="size-3.5" aria-hidden="true" />
			</button>
		</span>
	)
}
