"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Checkbox } from "@/components/shadcn/checkbox"
import { Skeleton } from "@/components/shadcn/skeleton"
import { cn } from "@/lib/utils"

import type { ExamBrowseFilterData } from "../hooks/use-exam-browse-query"
import type { ExamTagType } from "../../types/exam.types"

const TAG_TYPE_LABELS: Record<ExamTagType, string> = {
	unknown: "Other",
	subject: "Subject",
	"exam-type": "Exam type",
	year: "Year",
	grade: "Grade",
	skill: "Skill",
	level: "Level",
	topic: "Topic",
}

interface Props {
	data: ExamBrowseFilterData
	idPrefix?: string
	category: string
	tagIds: string[]
	onCategoryChange: (slug: string) => void
	onTagChange: (id: string, checked: boolean) => void
	onClear: () => void
}

export function ExamFilterPanel({
	data,
	idPrefix = "desktop",
	category,
	tagIds,
	onCategoryChange,
	onTagChange,
	onClear,
}: Props) {
	const [expandedGroups, setExpandedGroups] = useState<string[]>([])
	const visibleCategories = data.categories?.filter(
		(item) => item.examCount > 0 || item.slug === category
	)

	return (
		<div className="space-y-7">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-base font-semibold">Filters</h2>
				{(category || tagIds.length > 0) && (
					<Button type="button" variant="link" size="sm" onClick={onClear}>
						Clear
					</Button>
				)}
			</div>

			<fieldset className="space-y-3">
				<legend className="mb-3 text-sm font-semibold">Category</legend>
				{data.categoryError ? (
					<Alert>
						<AlertTitle>Could not load categories.</AlertTitle>
						<AlertDescription>
							<Button
								type="button"
								variant="link"
								size="sm"
								className="px-0"
								onClick={data.onRetryCategories}
							>
								Try again
							</Button>
						</AlertDescription>
					</Alert>
				) : !data.categories ? (
					<div className="space-y-3">
						<Skeleton className="h-4 w-4/5" />
						<Skeleton className="h-4 w-2/3" />
						<Skeleton className="h-4 w-11/12" />
					</div>
				) : (
					<div className="space-y-2">
						<label className="flex cursor-pointer items-center gap-3 py-1 text-sm">
							<input
								type="radio"
								name={`${idPrefix}-exam-category`}
								checked={!category}
								onChange={() => onCategoryChange("")}
								className="size-4 accent-primary"
							/>
							<span className="min-w-0 flex-1">All categories</span>
						</label>
						{visibleCategories?.map((item) => (
							<label
								key={item.id}
								className="flex cursor-pointer items-center gap-3 py-1 text-sm"
							>
								<input
									type="radio"
									name={`${idPrefix}-exam-category`}
									checked={category === item.slug}
									onChange={() => onCategoryChange(item.slug)}
									className="size-4 accent-primary"
								/>
								<span className="min-w-0 flex-1 wrap-break-word">
									{item.name}
								</span>
								<span className="text-xs text-muted-foreground">
									{item.examCount}
								</span>
							</label>
						))}
					</div>
				)}
			</fieldset>

			{data.tagError ? (
				<Alert>
					<AlertTitle>Could not load tags.</AlertTitle>
					<AlertDescription>
						<Button
							type="button"
							variant="link"
							size="sm"
							className="px-0"
							onClick={data.onRetryTags}
						>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			) : !data.groups ? (
				<div className="space-y-3">
					<Skeleton className="h-4 w-4/5" />
					<Skeleton className="h-4 w-2/3" />
					<Skeleton className="h-4 w-11/12" />
				</div>
			) : (
				data.groups.map((group) => {
					const key = group.type
					const items = group.items.filter(
						(item) =>
							item.examCount > 0 || tagIds.includes(item.id.toLowerCase())
					)
					if (!items.length) return null

					const expanded = expandedGroups.includes(key)
					const selected = items.filter((item) =>
						tagIds.includes(item.id.toLowerCase())
					)
					const displayItems = expanded
						? items
						: Array.from(
								new Map(
									[...selected, ...items.slice(0, 6)].map((item) => [
										item.id,
										item,
									])
								).values()
							)

					return (
						<fieldset key={key} className="space-y-3">
							<legend className="mb-3 text-sm font-semibold">
								{TAG_TYPE_LABELS[group.type]}
							</legend>
							<div className="space-y-2">
								{displayItems.map((item) => {
									const id = item.id.toLowerCase()
									const inputId = `${idPrefix}-tag-${key}-${id}`
									return (
										<label
											key={item.id}
											htmlFor={inputId}
											className="flex cursor-pointer items-start gap-3 py-1 text-sm"
										>
											<Checkbox
												id={inputId}
												checked={tagIds.includes(id)}
												onCheckedChange={(checked) =>
													onTagChange(id, checked)
												}
												className="mt-0.5"
											/>
											<span className="min-w-0 flex-1 wrap-break-word">
												{item.name}
											</span>
											<span className="shrink-0 text-xs text-muted-foreground">
												{item.examCount}
											</span>
										</label>
									)
								})}
							</div>
							{items.length > 6 && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() =>
										setExpandedGroups((current) =>
											current.includes(key)
												? current.filter((item) => item !== key)
												: [...current, key]
										)
									}
								>
									{expanded ? "Show less" : `Show all ${items.length}`}
									<ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
								</Button>
							)}
						</fieldset>
					)
				})
			)}
		</div>
	)
}
