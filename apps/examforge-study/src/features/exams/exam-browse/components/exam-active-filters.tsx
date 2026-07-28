"use client"

import { X } from "lucide-react"

import { Badge } from "@/components/shadcn/badge"
import { Button } from "@/components/shadcn/button"

import type { ExamBrowseFiltersViewModel } from "../hooks/use-exam-browse-query"

interface Props {
	search: string
	filters: ExamBrowseFiltersViewModel
}

export function ExamActiveFilters({ search, filters }: Props) {
	const items = [
		...(search
			? [{ id: "search", label: `Title: ${search}`, remove: filters.onClearSearch }]
			: []),
		...(filters.activeCategoryName
			? [
					{
						id: "category",
						label: filters.activeCategoryName,
						remove: filters.onClearCategory,
					},
				]
			: []),
		...filters.activeTags.map((tag) => ({
			id: tag.id,
			label: tag.name,
			remove: () => filters.onRemoveTag(tag.id),
		})),
	]

	if (!items.length) return null

	return (
		<div className="flex flex-wrap items-center gap-2">
			{items.map((item) => (
				<Badge key={item.id} variant="secondary" className="h-8 max-w-full pl-3">
					<span className="truncate">{item.label}</span>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						onClick={item.remove}
					>
						<X />
					</Button>
				</Badge>
			))}
			<Button
				type="button"
				variant="link"
				size="sm"
				onClick={filters.onClearAll}
			>
				Clear all
			</Button>
		</div>
	)
}
