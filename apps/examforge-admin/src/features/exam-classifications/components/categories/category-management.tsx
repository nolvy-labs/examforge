"use client"

import { useMemo, useRef } from "react"
import {
	ArchiveBoxIcon,
	ArrowCounterClockwiseIcon,
	DotsThreeIcon,
	FunnelIcon,
	MagnifyingGlassIcon,
	PencilSimpleIcon,
	SpinnerGapIcon,
	XIcon,
} from "@phosphor-icons/react"

import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert"
import { Badge } from "@/components/shadcn/badge"
import { Button } from "@/components/shadcn/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu"
import { Input } from "@/components/shadcn/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/shadcn/select"
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/shadcn/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip"
import {
	useAdminExamCategories,
	useAdminExamTags,
} from "@/features/exam-classifications/hooks/exam-classification.hook"
import {
	getAdminExamCategoryServerFilters,
	getVisibleAdminExamCategories,
} from "@/features/exam-classifications/model/classification-presentation"
import { EXAM_CATEGORY_MATCH_MODE_LABELS } from "@/features/exam-classifications/types/exam-classification.schema"
import type {
	AdminExamCategory,
	AdminExamTag,
	AssignableExamCategoryMatchMode,
} from "@/features/exam-classifications/types/exam-classification.types"

import type {
	CategoryFeaturedFilter,
	CategoryManagementState,
	CategorySort,
	ClassificationArchiveFilter,
} from "../../model/classification-management-query"
import {
	ClassificationListEmpty,
	ClassificationListError,
	ClassificationTableSkeleton,
} from "../shared/classification-list-state"

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	year: "numeric",
	month: "short",
	day: "numeric",
})

interface Actions {
	setArchive: (archive: ClassificationArchiveFilter) => void
	setMatchMode: (mode: AssignableExamCategoryMatchMode | null) => void
	setFeatured: (featured: CategoryFeaturedFilter) => void
	setCategorySort: (sort: CategorySort) => void
	clearFilters: () => void
}

interface Props {
	state: CategoryManagementState
	search: { value: string; setValue: (value: string) => void }
	actions: Actions
	onCreate: (trigger: HTMLButtonElement) => void
	onEdit: (category: AdminExamCategory, trigger: HTMLButtonElement) => void
	onStatus: (
		category: AdminExamCategory,
		action: "archive" | "restore",
		trigger: HTMLButtonElement
	) => void
}

export function CategoryManagement({ state, search, actions, onCreate, onEdit, onStatus }: Props) {
	const categoriesQuery = useAdminExamCategories(
		getAdminExamCategoryServerFilters(state)
	)
	const tagsQuery = useAdminExamTags({ includeArchived: true })
	const categories = useMemo(
		() => getVisibleAdminExamCategories(categoriesQuery.data ?? [], state),
		[categoriesQuery.data, state]
	)
	const tagById = useMemo(
		() => new Map((tagsQuery.data ?? []).map((tag) => [tag.id, tag])),
		[tagsQuery.data]
	)
	const filtered = Boolean(
		state.search || state.archive !== "active" || state.matchMode !== null || state.featured !== "all"
	)
	const hasChanges = filtered || state.sort !== "display-order"

	return (
		<section className="space-y-4" aria-labelledby="category-results-heading">
			<div className="space-y-3">
				<div className="flex flex-col gap-2 border bg-card p-3 xl:flex-row xl:items-center">
					<div className="relative min-w-0 flex-1 sm:min-w-64">
						<label htmlFor="category-management-search" className="sr-only">Search categories by name, slug, or description</label>
						<MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input id="category-management-search" type="search" value={search.value} placeholder="Search categories" className="pr-9 pl-8" onChange={(event) => search.setValue(event.target.value)} />
						{search.value && <Button type="button" variant="ghost" size="icon-xs" className="absolute top-1/2 right-1.5 -translate-y-1/2" aria-label="Clear category search" onClick={() => search.setValue("")}><XIcon /></Button>}
					</div>
					<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
						<Select value={state.archive} onValueChange={(value) => {
							if (value === "active" || value === "archived" || value === "all") actions.setArchive(value)
						}}><SelectTrigger className="w-full sm:w-36" aria-label="Filter category status"><SelectValue>{state.archive === "active" ? "Active" : state.archive === "archived" ? "Archived" : "All statuses"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem><SelectItem value="all">All statuses</SelectItem></SelectContent></Select>
						<Select value={state.matchMode === null ? "all" : String(state.matchMode)} onValueChange={(value) => actions.setMatchMode(value === "1" ? 1 : value === "2" ? 2 : null)}><SelectTrigger className="w-full sm:w-36" aria-label="Filter match mode"><SelectValue>{state.matchMode === null ? "All modes" : EXAM_CATEGORY_MATCH_MODE_LABELS[state.matchMode]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">All modes</SelectItem><SelectItem value="1">All tags</SelectItem><SelectItem value="2">Any tag</SelectItem></SelectContent></Select>
						<Select value={state.featured} onValueChange={(value) => {
							if (value === "all" || value === "featured" || value === "not-featured") actions.setFeatured(value)
						}}><SelectTrigger className="w-full sm:w-36" aria-label="Filter featured state"><SelectValue>{state.featured === "all" ? "All featured" : state.featured === "featured" ? "Featured" : "Not featured"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">All featured</SelectItem><SelectItem value="featured">Featured</SelectItem><SelectItem value="not-featured">Not featured</SelectItem></SelectContent></Select>
						<Select value={state.sort} onValueChange={(value) => {
							if (value && ["display-order", "name-asc", "name-desc", "newest", "oldest"].includes(value)) actions.setCategorySort(value as CategorySort)
						}}><SelectTrigger className="w-full sm:w-40" aria-label="Sort categories"><SelectValue>{categorySortLabel(state.sort)}</SelectValue></SelectTrigger><SelectContent><SelectItem value="display-order">Display order</SelectItem><SelectItem value="name-asc">Name A–Z</SelectItem><SelectItem value="name-desc">Name Z–A</SelectItem><SelectItem value="newest">Newest</SelectItem><SelectItem value="oldest">Oldest</SelectItem></SelectContent></Select>
					</div>
				</div>
				<div className="flex min-h-7 items-center gap-2 text-xs text-muted-foreground"><FunnelIcon /><span>Active filters</span><Badge variant={filtered ? "secondary" : "outline"}>{Number(Boolean(state.search)) + Number(state.archive !== "active") + Number(state.matchMode !== null) + Number(state.featured !== "all")}</Badge>{hasChanges && <Button type="button" variant="ghost" size="sm" onClick={actions.clearFilters}><XIcon /> Clear filters</Button>}</div>
			</div>

			<div className="flex min-h-7 items-center justify-between gap-3"><h2 id="category-results-heading" className="text-sm font-medium">Category results</h2>{categoriesQuery.isFetching && categoriesQuery.data && <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status"><SpinnerGapIcon className="animate-spin" /> Updating categories…</p>}</div>
			{categoriesQuery.isPending && !categoriesQuery.data ? <ClassificationTableSkeleton label="categories" /> : categoriesQuery.isError && !categoriesQuery.data ? <ClassificationListError label="Categories" onRetry={() => void categoriesQuery.refetch()} /> : <>
				{categoriesQuery.isError && categoriesQuery.data && <Alert><AlertTitle>Updated categories could not be loaded</AlertTitle><AlertDescription>The last successful results remain visible.</AlertDescription></Alert>}
				{categories.length ? <CategoryTable categories={categories} tagById={tagById} onEdit={onEdit} onStatus={onStatus} /> : <ClassificationListEmpty label="categories" filtered={filtered} onClear={actions.clearFilters} onCreate={onCreate} />}
			</>}
		</section>
	)
}

function CategoryTable({ categories, tagById, onEdit, onStatus }: Pick<Props, "onEdit" | "onStatus"> & { categories: AdminExamCategory[]; tagById: Map<string, AdminExamTag> }) {
	return <div className="border bg-card"><Table className="table-fixed min-w-5xl"><TableCaption className="sr-only">Exam categories with matching rules, associated tags, feature state, order, status, and actions.</TableCaption><TableHeader><TableRow><TableHead className="w-[22%]">Category</TableHead><TableHead className="w-24">Match</TableHead><TableHead>Associated tags</TableHead><TableHead className="w-24">Featured</TableHead><TableHead className="w-20">Order</TableHead><TableHead className="w-24">Status</TableHead><TableHead className="hidden w-32 lg:table-cell">Updated</TableHead><TableHead className="w-12"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{categories.map((category) => <TableRow key={category.id}><TableCell className="whitespace-normal"><p className="truncate font-medium">{category.name}</p><p className="truncate text-muted-foreground">/{category.slug}</p><p className="mt-1 line-clamp-2 text-muted-foreground">{category.description}</p></TableCell><TableCell><Badge variant="outline">{EXAM_CATEGORY_MATCH_MODE_LABELS[category.matchMode]}</Badge></TableCell><TableCell className="whitespace-normal"><CategoryTags category={category} tagById={tagById} /></TableCell><TableCell><Badge variant={category.isFeatured ? "secondary" : "outline"}>{category.isFeatured ? "Featured" : "Standard"}</Badge></TableCell><TableCell>{category.displayOrder}</TableCell><TableCell><Badge variant={category.isArchived ? "outline" : "secondary"}>{category.isArchived ? "Archived" : "Active"}</Badge></TableCell><TableCell className="hidden lg:table-cell"><time dateTime={category.updatedAtUtc ?? category.createdAtUtc}>{dateFormatter.format(new Date(category.updatedAtUtc ?? category.createdAtUtc))}</time></TableCell><TableCell><CategoryActions category={category} onEdit={onEdit} onStatus={onStatus} /></TableCell></TableRow>)}</TableBody></Table></div>
}

function CategoryTags({ category, tagById }: { category: AdminExamCategory; tagById: Map<string, AdminExamTag> }) {
	const visible = category.tags.slice(0, 3)
	const hidden = category.tags.slice(3)
	if (!category.tags.length) return <span className="text-muted-foreground">No active tags</span>
	return <div className="flex flex-wrap gap-1">{visible.map((tag) => { const fullTag = tagById.get(tag.id); const suffix = !fullTag ? " (unavailable)" : fullTag.isArchived ? " (archived)" : ""; return <Badge key={tag.id} variant={suffix ? "outline" : "secondary"}>{tag.name}{suffix}</Badge>})}{hidden.length > 0 && <Tooltip><TooltipTrigger render={<Badge variant="outline" tabIndex={0} />}>+{hidden.length}</TooltipTrigger><TooltipContent>{hidden.map((tag) => { const fullTag = tagById.get(tag.id); return `${tag.name}${!fullTag ? " (unavailable)" : fullTag.isArchived ? " (archived)" : ""}` }).join(", ")}</TooltipContent></Tooltip>}<span className="sr-only">All tags: {category.tags.map((tag) => tag.name).join(", ")}</span></div>
}

function CategoryActions({ category, onEdit, onStatus }: Pick<Props, "onEdit" | "onStatus"> & { category: AdminExamCategory }) {
	const triggerRef = useRef<HTMLButtonElement>(null)
	return <DropdownMenu><DropdownMenuTrigger render={<Button ref={triggerRef} type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${category.name}`} />}><DotsThreeIcon weight="bold" /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-44"><DropdownMenuGroup><DropdownMenuLabel>{category.name}</DropdownMenuLabel><DropdownMenuItem onClick={() => { if (triggerRef.current) onEdit(category, triggerRef.current) }}><PencilSimpleIcon /> Edit</DropdownMenuItem>{category.isArchived ? <DropdownMenuItem onClick={() => { if (triggerRef.current) onStatus(category, "restore", triggerRef.current) }}><ArrowCounterClockwiseIcon /> Restore</DropdownMenuItem> : <DropdownMenuItem variant="destructive" onClick={() => { if (triggerRef.current) onStatus(category, "archive", triggerRef.current) }}><ArchiveBoxIcon /> Archive</DropdownMenuItem>}</DropdownMenuGroup></DropdownMenuContent></DropdownMenu>
}

function categorySortLabel(sort: CategorySort) {
	return { "display-order": "Display order", "name-asc": "Name A–Z", "name-desc": "Name Z–A", newest: "Newest", oldest: "Oldest" }[sort]
}
