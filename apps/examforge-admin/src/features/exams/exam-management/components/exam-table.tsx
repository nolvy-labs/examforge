"use client"

import { ArchiveBoxIcon, CheckCircleIcon } from "@phosphor-icons/react"

import { Badge } from "@/components/shadcn/badge"
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

import type { AdminExamSummary } from "../../types/exam.types"
import { ExamRowActions } from "./exam-row-actions"

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	year: "numeric",
	month: "short",
	day: "numeric",
})

function formatDate(value: string) {
	return dateFormatter.format(new Date(value))
}

interface Props {
	exams: AdminExamSummary[]
	isPlaceholderData: boolean
	pendingArchiveIds: ReadonlySet<string>
	pendingRestoreIds: ReadonlySet<string>
	onArchive: (id: string) => Promise<void>
	onRestore: (id: string) => Promise<void>
	onRefresh: () => void
}

export function ExamTable({
	exams,
	isPlaceholderData,
	pendingArchiveIds,
	pendingRestoreIds,
	onArchive,
	onRestore,
	onRefresh,
}: Props) {
	return (
		<div className="border bg-card" aria-busy={isPlaceholderData}>
			<Table className="table-fixed min-w-3xl">
				<TableCaption className="sr-only">
					Admin exams with metadata, status, tags, timestamps, and available actions.
				</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[34%]">Exam</TableHead>
						<TableHead className="w-24">Type</TableHead>
						<TableHead className="w-[28%]">Tags</TableHead>
						<TableHead className="w-24">Status</TableHead>
						<TableHead className="hidden w-32 lg:table-cell">Updated</TableHead>
						<TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className={isPlaceholderData ? "opacity-60" : undefined}>
					{exams.map((exam) => {
						const timestamp = exam.updatedAtUtc ?? exam.createdAtUtc
						const visibleTags = exam.tags.slice(0, 3)
						const hiddenTags = exam.tags.slice(3)

						return (
							<TableRow key={exam.id}>
								<TableCell className="whitespace-normal">
									<p className="truncate font-medium">{exam.title}</p>
									<p className="mt-1 truncate text-muted-foreground">/{exam.slug}</p>
									{exam.description && (
										<p className="mt-1 line-clamp-2 text-muted-foreground sm:hidden md:block">
											{exam.description}
										</p>
									)}
								</TableCell>
								<TableCell>
									<Badge variant="outline">{exam.type === 0 ? "Simple" : "IELTS"}</Badge>
								</TableCell>
								<TableCell className="whitespace-normal">
									<div className="flex flex-wrap gap-1">
										{visibleTags.map((tag) => (
											<Badge key={tag.id} variant={tag.isArchived ? "outline" : "secondary"}>
												{tag.name}{tag.isArchived ? " (archived)" : ""}
											</Badge>
										))}
										{hiddenTags.length > 0 && (
											<Tooltip>
												<TooltipTrigger render={<Badge variant="outline" tabIndex={0} />}>
													+{hiddenTags.length}
												</TooltipTrigger>
												<TooltipContent>
													{hiddenTags.map((tag) => `${tag.name}${tag.isArchived ? " (archived)" : ""}`).join(", ")}
												</TooltipContent>
											</Tooltip>
										)}
										<span className="sr-only">
											All tags: {exam.tags.map((tag) => `${tag.name}${tag.isArchived ? " archived" : ""}`).join(", ") || "none"}
										</span>
									</div>
								</TableCell>
								<TableCell>
									<Badge variant={exam.isArchived ? "outline" : "secondary"}>
										{exam.isArchived ? <ArchiveBoxIcon /> : <CheckCircleIcon />}
										{exam.isArchived ? "Archived" : "Active"}
									</Badge>
								</TableCell>
								<TableCell className="hidden lg:table-cell">
									<time dateTime={timestamp}>{formatDate(timestamp)}</time>
									{!exam.updatedAtUtc && <span className="sr-only"> created</span>}
								</TableCell>
								<TableCell>
									<ExamRowActions
										exam={exam}
										isArchiving={pendingArchiveIds.has(exam.id)}
										isRestoring={pendingRestoreIds.has(exam.id)}
										onArchive={onArchive}
										onRestore={onRestore}
										onRefresh={onRefresh}
									/>
								</TableCell>
							</TableRow>
						)
					})}
				</TableBody>
			</Table>
		</div>
	)
}
