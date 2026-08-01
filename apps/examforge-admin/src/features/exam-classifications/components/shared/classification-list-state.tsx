"use client"

import {
	ArrowClockwiseIcon,
	FolderPlusIcon,
	FunnelXIcon,
	WarningIcon,
} from "@phosphor-icons/react"

import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Card, CardContent } from "@/components/shadcn/card"
import { Skeleton } from "@/components/shadcn/skeleton"

export function ClassificationTableSkeleton({ label }: { label: string }) {
	return (
		<div className="space-y-2 border bg-card p-3" aria-busy="true">
			<p className="sr-only" role="status">Loading {label}…</p>
			{Array.from({ length: 6 }, (_, index) => (
				<div key={index} className="flex items-center gap-4 border-b py-3 last:border-0">
					<Skeleton className="h-9 flex-1" />
					<Skeleton className="hidden h-6 w-28 sm:block" />
					<Skeleton className="h-7 w-8" />
				</div>
			))}
		</div>
	)
}

export function ClassificationListError({
	label,
	onRetry,
}: {
	label: string
	onRetry: () => void
}) {
	return (
		<Alert variant="destructive">
			<WarningIcon />
			<AlertTitle>{label} could not be loaded</AlertTitle>
			<AlertDescription className="flex items-center justify-between gap-3">
				<span>Check your connection and try again.</span>
				<Button type="button" variant="outline" size="sm" onClick={onRetry}>
					<ArrowClockwiseIcon /> Retry
				</Button>
			</AlertDescription>
		</Alert>
	)
}

export function ClassificationListEmpty({
	label,
	filtered,
	onClear,
	onCreate,
}: {
	label: "tags" | "categories"
	filtered: boolean
	onClear: () => void
	onCreate: (trigger: HTMLButtonElement) => void
}) {
	return (
		<Card>
			<CardContent className="flex flex-col items-center px-6 py-16 text-center">
				{filtered ? (
					<FunnelXIcon className="size-9 text-muted-foreground" />
				) : (
					<FolderPlusIcon className="size-9 text-muted-foreground" />
				)}
				<h3 className="mt-4 text-base font-semibold">
					{filtered
						? `No ${label} match these filters`
						: `No ${label} have been created`}
				</h3>
				<p className="mt-2 max-w-md text-sm text-muted-foreground">
					{filtered
						? "Try a different search, filter, or status."
						: `Create the first ${label === "tags" ? "tag" : "category"} to begin organizing exams.`}
				</p>
				{filtered ? (
					<Button type="button" variant="outline" className="mt-5" onClick={onClear}>
						Clear filters
					</Button>
				) : (
					<Button
						type="button"
						className="mt-5"
						onClick={(event) => onCreate(event.currentTarget)}
					>
						<FolderPlusIcon /> Create {label === "tags" ? "tag" : "category"}
					</Button>
				)}
			</CardContent>
		</Card>
	)
}
