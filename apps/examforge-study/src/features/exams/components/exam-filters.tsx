"use client"

import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { ChevronDown, SlidersHorizontal, X } from "lucide-react"

import { Button, buttonVariants } from "@/components/shadcn/button"
import { Checkbox } from "@/components/shadcn/checkbox"
import { cn } from "@/lib/utils"

import type {
	ExamTagType,
	StudentExamCategory,
	StudentExamFilterGroup,
} from "../model/exam-browse.types"

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

export function getTagTypeLabel(type: ExamTagType) {
	return TAG_TYPE_LABELS[type]
}

export interface ExamFilterData {
	categories?: StudentExamCategory[]
	groups?: StudentExamFilterGroup[]
	categoryError?: boolean
	tagError?: boolean
	onRetryCategories: () => void
	onRetryTags: () => void
}

interface FilterPanelProps {
	data: ExamFilterData
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
}: FilterPanelProps) {
	const {
		categories,
		groups,
		categoryError,
		tagError,
		onRetryCategories,
		onRetryTags,
	} = data
	const [expandedGroups, setExpandedGroups] = useState<string[]>([])
	const hasFilters = Boolean(category || tagIds.length)
	const visibleCategories = categories?.filter(
		(item) => item.examCount > 0 || item.slug === category
	)

	return (
		<div className="space-y-7">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-base font-semibold text-slate-950">Filters</h2>
				{hasFilters && (
					<Button type="button" variant="link" size="sm" onClick={onClear}>
						Clear
					</Button>
				)}
			</div>

			<fieldset className="space-y-3">
				<legend className="mb-3 text-sm font-semibold text-slate-900">Category</legend>
				{categoryError ? (
					<MetadataError label="categories" onRetry={onRetryCategories} />
				) : !categories ? (
					<FilterSkeleton />
				) : (
					<div className="space-y-2">
						<CategoryOption
							name={`${idPrefix}-exam-category`}
							checked={!category}
							label="All categories"
							onChange={() => onCategoryChange("")}
						/>
						{visibleCategories?.map((item) => (
							<CategoryOption
								key={item.id}
								name={`${idPrefix}-exam-category`}
								checked={category === item.slug}
								label={item.name}
								count={item.examCount}
								onChange={() => onCategoryChange(item.slug)}
							/>
						))}
					</div>
				)}
			</fieldset>

			{tagError ? (
				<MetadataError label="tags" onRetry={onRetryTags} />
			) : !groups ? (
				<FilterSkeleton />
			) : (
				groups.map((group) => {
					const key = String(group.type)
					const items = group.items.filter(
						(item) => item.examCount > 0 || tagIds.includes(item.id.toLowerCase())
					)
					if (!items.length) return null
					const expanded = expandedGroups.includes(key)
					const selected = items.filter((item) =>
						tagIds.includes(item.id.toLowerCase())
					)
					const initiallyVisible = items.slice(0, 6)
					const displayItems = expanded
						? items
						: Array.from(new Map(
								[...selected, ...initiallyVisible].map((item) => [item.id, item])
							).values())

					return (
						<fieldset key={key} className="space-y-3">
							<legend className="mb-3 text-sm font-semibold text-slate-900">
								{getTagTypeLabel(group.type)}
							</legend>
							<div className="space-y-2">
								{displayItems.map((item) => {
									const id = item.id.toLowerCase()
									const inputId = `${idPrefix}-tag-${key}-${id}`
									return (
										<label
											key={item.id}
											htmlFor={inputId}
											className="flex cursor-pointer items-start gap-3 rounded-md py-1 text-sm text-slate-700"
										>
											<Checkbox
												id={inputId}
												checked={tagIds.includes(id)}
												onCheckedChange={(checked) => onTagChange(id, checked)}
												className="mt-0.5"
											/>
											<span className="min-w-0 flex-1 wrap-break-word">{item.name}</span>
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
									aria-expanded={expanded}
									onClick={() =>
										setExpandedGroups((current) =>
											current.includes(key)
												? current.filter((item) => item !== key)
												: [...current, key]
										)
									}
								>
									{expanded ? "Show less" : `Show all ${items.length}`}
									<ChevronDown
										className={cn("transition-transform", expanded && "rotate-180")}
										aria-hidden="true"
									/>
								</Button>
							)}
						</fieldset>
					)
				})
			)}
		</div>
	)
}

function CategoryOption({
	name,
	checked,
	label,
	count,
	onChange,
}: {
	name: string
	checked: boolean
	label: string
	count?: number
	onChange: () => void
}) {
	return (
		<label className="flex cursor-pointer items-center gap-3 rounded-md py-1 text-sm text-slate-700">
			<input
				type="radio"
				name={name}
				checked={checked}
				onChange={onChange}
				className="size-4 accent-indigo-600"
			/>
			<span className="min-w-0 flex-1 wrap-break-word">{label}</span>
			{count !== undefined && (
				<span className="text-xs text-muted-foreground">{count}</span>
			)}
		</label>
	)
}

function FilterSkeleton() {
	return (
		<div aria-hidden="true" className="space-y-3">
			{[80, 65, 90].map((width) => (
				<div
					key={width}
					className="h-4 animate-pulse rounded bg-slate-200 motion-reduce:animate-none"
					style={{ width: `${width}%` }}
				/>
			))}
		</div>
	)
}

function MetadataError({ label, onRetry }: { label: string; onRetry: () => void }) {
	return (
		<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
			<p>Could not load {label}.</p>
			<Button type="button" variant="link" size="sm" className="px-0" onClick={onRetry}>
				Try again
			</Button>
		</div>
	)
}

interface MobileFiltersProps {
	data: ExamFilterData
	category: string
	tagIds: string[]
	activeCount: number
	onApply: (category: string, tagIds: string[]) => void
}

export function ExamFilterDrawer({
	data,
	category,
	tagIds,
	activeCount,
	onApply,
}: MobileFiltersProps) {
	const [open, setOpen] = useState(false)
	const [draftCategory, setDraftCategory] = useState(category)
	const [draftTagIds, setDraftTagIds] = useState(tagIds)

	function handleOpenChange(nextOpen: boolean) {
		if (nextOpen) {
			setDraftCategory(category)
			setDraftTagIds(tagIds)
		}
		setOpen(nextOpen)
	}

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange}>
			<Dialog.Trigger
				className={cn(buttonVariants({ variant: "outline" }), "lg:hidden")}
			>
				<SlidersHorizontal aria-hidden="true" />
				Filters{activeCount > 0 ? ` (${activeCount})` : ""}
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-40 bg-slate-950/40 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
				<Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-[min(92vw,25rem)] flex-col bg-white shadow-2xl outline-none data-ending-style:translate-x-full data-starting-style:translate-x-full motion-reduce:transition-none">
					<div className="flex items-start justify-between border-b px-5 py-4">
						<div>
							<Dialog.Title className="text-lg font-semibold">Filter exams</Dialog.Title>
							<Dialog.Description className="text-sm text-muted-foreground">
								Choose a category and any tags, then apply.
							</Dialog.Description>
						</div>
						<Dialog.Close
							aria-label="Close filters"
							className={buttonVariants({ variant: "ghost", size: "icon" })}
						>
							<X aria-hidden="true" />
						</Dialog.Close>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
						<ExamFilterPanel
							data={data}
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
					<div className="flex gap-3 border-t bg-white p-4">
						<Button
							type="button"
							variant="outline"
							className="flex-1"
							onClick={() => {
								setDraftCategory("")
								setDraftTagIds([])
							}}
						>
							Clear
						</Button>
						<Button
							type="button"
							className="flex-1 bg-indigo-600 hover:bg-indigo-700"
							onClick={() => {
								onApply(draftCategory, draftTagIds)
								setOpen(false)
							}}
						>
							Apply filters
						</Button>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
