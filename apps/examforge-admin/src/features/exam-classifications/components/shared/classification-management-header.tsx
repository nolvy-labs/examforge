"use client"

import { PlusIcon } from "@phosphor-icons/react"

import { Button } from "@/components/shadcn/button"

import type { ClassificationTab } from "../../model/classification-management-query"

interface Props {
	tab: ClassificationTab
	onTabChange: (tab: ClassificationTab) => void
	onCreate: (trigger: HTMLButtonElement) => void
}

export function ClassificationManagementHeader({
	tab,
	onTabChange,
	onCreate,
}: Props) {
	return (
		<header className="space-y-5 border-b pb-5">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
						Content operations
					</p>
					<h1 className="mt-1 text-2xl font-semibold tracking-tight">
						Classifications
					</h1>
					<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
						Manage the tags and categories used to organize exams and student discovery.
					</p>
				</div>
				<Button
					type="button"
					size="lg"
					onClick={(event) => onCreate(event.currentTarget)}
				>
					<PlusIcon data-icon="inline-start" />
					Create {tab === "tags" ? "tag" : "category"}
				</Button>
			</div>

			<div
				role="tablist"
				aria-label="Classification type"
				className="flex w-fit gap-1 border bg-muted/30 p-1"
			>
				{(["tags", "categories"] as const).map((value) => (
					<Button
						key={value}
						type="button"
						role="tab"
						aria-selected={tab === value}
						variant={tab === value ? "secondary" : "ghost"}
						size="sm"
						onClick={() => onTabChange(value)}
					>
						{value === "tags" ? "Tags" : "Categories"}
					</Button>
				))}
			</div>
		</header>
	)
}
