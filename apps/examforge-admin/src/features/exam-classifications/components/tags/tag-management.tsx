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
import { useAdminExamTags } from "@/features/exam-classifications/hooks/exam-classification.hook"
import {
	getAdminExamTagServerFilters,
	getVisibleAdminExamTags,
} from "@/features/exam-classifications/model/classification-presentation"
import { EXAM_TAG_TYPE_LABELS } from "@/features/exam-classifications/types/exam-classification.schema"
import type {
	AdminExamTag,
	AssignableExamTagType,
} from "@/features/exam-classifications/types/exam-classification.types"

import type {
	ClassificationArchiveFilter,
	TagManagementState,
	TagSort,
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
	setTagType: (type: AssignableExamTagType | null) => void
	setTagSort: (sort: TagSort) => void
	clearFilters: () => void
}

interface Props {
	state: TagManagementState
	search: { value: string; setValue: (value: string) => void }
	actions: Actions
	onCreate: (trigger: HTMLButtonElement) => void
	onEdit: (tag: AdminExamTag, trigger: HTMLButtonElement) => void
	onStatus: (
		tag: AdminExamTag,
		action: "archive" | "restore",
		trigger: HTMLButtonElement
	) => void
}

export function TagManagement({
	state,
	search,
	actions,
	onCreate,
	onEdit,
	onStatus,
}: Props) {
	const tagsQuery = useAdminExamTags(getAdminExamTagServerFilters(state))
	const tags = useMemo(
		() => getVisibleAdminExamTags(tagsQuery.data ?? [], state),
		[tagsQuery.data, state]
	)
	const filtered = Boolean(
		state.search || state.type !== null || state.archive !== "active"
	)
	const hasChanges = filtered || state.sort !== "name-asc"

	return (
		<section className="space-y-4" aria-labelledby="tag-results-heading">
			<div className="space-y-3">
				<div className="flex flex-col gap-2 border bg-card p-3 lg:flex-row lg:items-center">
					<div className="relative min-w-0 flex-1 sm:min-w-64">
						<label htmlFor="tag-management-search" className="sr-only">
							Search tags by name, slug, or description
						</label>
						<MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							id="tag-management-search"
							type="search"
							value={search.value}
							placeholder="Search tags"
							className="pr-9 pl-8"
							onChange={(event) => search.setValue(event.target.value)}
						/>
						{search.value && (
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								className="absolute top-1/2 right-1.5 -translate-y-1/2"
								aria-label="Clear tag search"
								onClick={() => search.setValue("")}
							>
								<XIcon />
							</Button>
						)}
					</div>
					<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
						<Select
							value={state.type === null ? "all" : String(state.type)}
							onValueChange={(value) => {
								if (value === "all" || value === null) actions.setTagType(null)
								else actions.setTagType(Number(value) as AssignableExamTagType)
							}}
						>
							<SelectTrigger className="w-full sm:w-36" aria-label="Filter by tag type">
								<SelectValue>
									{state.type === null ? "All types" : EXAM_TAG_TYPE_LABELS[state.type]}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All types</SelectItem>
								{([1, 2, 3, 4, 5, 6, 7] as const).map((type) => (
									<SelectItem key={type} value={String(type)}>
										{EXAM_TAG_TYPE_LABELS[type]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select value={state.archive} onValueChange={(value) => {
							if (value === "active" || value === "archived" || value === "all") actions.setArchive(value)
						}}>
							<SelectTrigger className="w-full sm:w-36" aria-label="Filter tag status">
								<SelectValue>{state.archive === "active" ? "Active" : state.archive === "archived" ? "Archived" : "All statuses"}</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="archived">Archived</SelectItem>
								<SelectItem value="all">All statuses</SelectItem>
							</SelectContent>
						</Select>
						<Select value={state.sort} onValueChange={(value) => {
							if (value && ["name-asc", "name-desc", "type", "newest", "oldest"].includes(value)) actions.setTagSort(value as TagSort)
						}}>
							<SelectTrigger className="col-span-2 w-full sm:w-36" aria-label="Sort tags">
								<SelectValue>{tagSortLabel(state.sort)}</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="name-asc">Name A–Z</SelectItem>
								<SelectItem value="name-desc">Name Z–A</SelectItem>
								<SelectItem value="type">Type</SelectItem>
								<SelectItem value="newest">Newest</SelectItem>
								<SelectItem value="oldest">Oldest</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className="flex min-h-7 items-center gap-2 text-xs text-muted-foreground">
					<FunnelIcon /> <span>Active filters</span>
					<Badge variant={filtered ? "secondary" : "outline"}>{Number(Boolean(state.search)) + Number(state.type !== null) + Number(state.archive !== "active")}</Badge>
					{hasChanges && <Button type="button" variant="ghost" size="sm" onClick={actions.clearFilters}><XIcon /> Clear filters</Button>}
				</div>
			</div>

			<div className="flex min-h-7 items-center justify-between gap-3">
				<h2 id="tag-results-heading" className="text-sm font-medium">Tag results</h2>
				{tagsQuery.isFetching && tagsQuery.data && <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status"><SpinnerGapIcon className="animate-spin" /> Updating tags…</p>}
			</div>

			{tagsQuery.isPending && !tagsQuery.data ? (
				<ClassificationTableSkeleton label="tags" />
			) : tagsQuery.isError && !tagsQuery.data ? (
				<ClassificationListError label="Tags" onRetry={() => void tagsQuery.refetch()} />
			) : (
				<>
					{tagsQuery.isError && tagsQuery.data && <Alert><AlertTitle>Updated tags could not be loaded</AlertTitle><AlertDescription>The last successful results remain visible.</AlertDescription></Alert>}
					{tags.length ? (
						<TagTable tags={tags} onEdit={onEdit} onStatus={onStatus} />
					) : (
						<ClassificationListEmpty label="tags" filtered={filtered} onClear={actions.clearFilters} onCreate={onCreate} />
					)}
				</>
			)}
		</section>
	)
}

function TagTable({ tags, onEdit, onStatus }: Pick<Props, "onEdit" | "onStatus"> & { tags: AdminExamTag[] }) {
	return (
		<div className="border bg-card">
			<Table className="table-fixed min-w-4xl">
				<TableCaption className="sr-only">Exam tags with type, slug, description, status, timestamps, and actions.</TableCaption>
				<TableHeader><TableRow>
					<TableHead className="w-[18%]">Name</TableHead><TableHead className="w-28">Type</TableHead><TableHead className="w-[18%]">Slug</TableHead><TableHead>Description</TableHead><TableHead className="w-24">Status</TableHead><TableHead className="hidden w-32 lg:table-cell">Updated</TableHead><TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
				</TableRow></TableHeader>
				<TableBody>{tags.map((tag) => <TableRow key={tag.id}>
					<TableCell className="truncate font-medium">{tag.name}</TableCell>
					<TableCell><Badge variant="outline">{EXAM_TAG_TYPE_LABELS[tag.type]}</Badge></TableCell>
					<TableCell className="truncate">/{tag.slug}</TableCell>
					<TableCell className="whitespace-normal"><p className="line-clamp-2 text-muted-foreground">{tag.description || "No description"}</p></TableCell>
					<TableCell><Badge variant={tag.isArchived ? "outline" : "secondary"}>{tag.isArchived ? "Archived" : "Active"}</Badge></TableCell>
					<TableCell className="hidden lg:table-cell"><time dateTime={tag.updatedAtUtc ?? tag.createdAtUtc}>{dateFormatter.format(new Date(tag.updatedAtUtc ?? tag.createdAtUtc))}</time></TableCell>
					<TableCell><TagActions tag={tag} onEdit={onEdit} onStatus={onStatus} /></TableCell>
				</TableRow>)}</TableBody>
			</Table>
		</div>
	)
}

function TagActions({ tag, onEdit, onStatus }: Pick<Props, "onEdit" | "onStatus"> & { tag: AdminExamTag }) {
	const triggerRef = useRef<HTMLButtonElement>(null)
	return <DropdownMenu><DropdownMenuTrigger render={<Button ref={triggerRef} type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${tag.name}`} />}><DotsThreeIcon weight="bold" /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-44"><DropdownMenuGroup><DropdownMenuLabel>{tag.name}</DropdownMenuLabel><DropdownMenuItem onClick={() => { if (triggerRef.current) onEdit(tag, triggerRef.current) }}><PencilSimpleIcon /> Edit</DropdownMenuItem>{tag.isArchived ? <DropdownMenuItem onClick={() => { if (triggerRef.current) onStatus(tag, "restore", triggerRef.current) }}><ArrowCounterClockwiseIcon /> Restore</DropdownMenuItem> : <DropdownMenuItem variant="destructive" onClick={() => { if (triggerRef.current) onStatus(tag, "archive", triggerRef.current) }}><ArchiveBoxIcon /> Archive</DropdownMenuItem>}</DropdownMenuGroup></DropdownMenuContent></DropdownMenu>
}

function tagSortLabel(sort: TagSort) {
	return { "name-asc": "Name A–Z", "name-desc": "Name Z–A", type: "Type", newest: "Newest", oldest: "Oldest" }[sort]
}
