"use client"

import { Fragment, useState } from "react"
import { ChevronDown } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Checkbox } from "@/components/shadcn/checkbox"
import { Skeleton } from "@/components/shadcn/skeleton"
import { cn } from "@/lib/utils"

import type { ExamBrowseFilterData } from "../hooks/use-exam-browse-query"
import { Separator } from "@/components/shadcn/separator"
import { RadioGroup, RadioGroupItem } from "@/components/shadcn/radio-group"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/shadcn/field"
import { Label } from "@/components/shadcn/label"

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
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-base font-semibold">Filters</h2>
				<Button
					type="button"
					variant="link"
					size="xs"
					onClick={onClear}
					disabled={!category && tagIds.length === 0}
				>
					Clear all
				</Button>
			</div>
			<Separator />
			<CategoryList
				data={data}
				category={category}
				idPrefix={idPrefix}
				onCategoryChange={onCategoryChange}
			/>
			<Separator />
			<TagList
				data={data}
				tagIds={tagIds}
				idPrefix={idPrefix}
				onTagChange={onTagChange}
			/>
		</div>
	)
}

interface CategoryListProps {
	data: ExamBrowseFilterData
	category: string
	idPrefix?: string
	onCategoryChange: (slug: string) => void
}

function CategoryList({ data, category, idPrefix = "desktop", onCategoryChange }: CategoryListProps) {
	const visibleCategories = data.categories?.filter(
		(item) => item.examCount > 0 || item.slug === category
	)
	return (
		<Fragment>
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
				<RadioGroup value={category} onValueChange={onCategoryChange} className="gap-4">
					<Label htmlFor={`${idPrefix}-category`}>Category</Label>
					<Field orientation="horizontal">
						<RadioGroupItem value={""} id={"all categories"} />
						<FieldContent className="flex-row gap-2 items-start justify-start">
							<FieldLabel htmlFor={"all categories"}>
								All categories
							</FieldLabel>
						</FieldContent>
					</Field>
					{visibleCategories && visibleCategories.length > 0 && (
						<Fragment>
							{visibleCategories.map((item) => (
								<Field orientation="horizontal" key={item.id}>
									<RadioGroupItem value={item.slug} id={item.id} />
									<FieldContent className="flex-row gap-2 items-start justify-start">
										<FieldLabel htmlFor={item.id}>
											{item.name}
										</FieldLabel>
										<FieldDescription>
											{item.examCount}
										</FieldDescription>
									</FieldContent>
								</Field>
							))}
						</Fragment>
					)}
				</RadioGroup>
			)}
		</Fragment>
	)
}

interface TagListProps {
	data: ExamBrowseFilterData
	tagIds: string[]
	idPrefix?: string
	onTagChange: (id: string, checked: boolean) => void
}

function TagList({ data, tagIds, idPrefix = "desktop", onTagChange }: TagListProps) {
	const [expandedGroups, setExpandedGroups] = useState<string[]>([])

	return (
		<Fragment>
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
						<FieldGroup key={key} className="gap-4">
							<Label htmlFor={`${idPrefix}-tag-${key}`}>Tag</Label>
							{displayItems.map((item) => {
								const id = item.id.toLowerCase()
								const inputId = `${idPrefix}-tag-${key}-${id}`
								return (
									<Field orientation="horizontal" key={id}>
										<Checkbox
											id={inputId}
											checked={tagIds.includes(id)}
											onCheckedChange={(checked) =>
												onTagChange(id, checked)
											}
										/>
										<FieldContent className="flex-row gap-2 items-start justify-start">
											<FieldLabel htmlFor={inputId}>
												{item.name}
											</FieldLabel>
											<FieldDescription className="whitespace-break-spaces">
												{item.examCount}
											</FieldDescription>
										</FieldContent>
									</Field>
								)
							})}
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
						</FieldGroup>
					)
				})
			)}
		</Fragment>
	)
}