"use client"

import { useEffect, useState } from "react"

import { Skeleton } from "@/components/shadcn/skeleton"
import type {
	AdminExamCategory,
	AdminExamTag,
} from "@/features/exam-classifications/types/exam-classification.types"

import { CategoryFormDialog } from "../components/categories/category-form-dialog"
import { CategoryManagement } from "../components/categories/category-management"
import { CategoryStatusDialog } from "../components/categories/category-status-dialog"
import { ClassificationManagementHeader } from "../components/shared/classification-management-header"
import { TagFormDialog } from "../components/tags/tag-form-dialog"
import { TagManagement } from "../components/tags/tag-management"
import { TagStatusDialog } from "../components/tags/tag-status-dialog"
import { useClassificationManagementNavigation } from "../hooks/use-classification-management-navigation"

type DialogState =
	| { kind: "create-tag"; trigger: HTMLButtonElement }
	| { kind: "edit-tag"; tag: AdminExamTag; trigger: HTMLButtonElement }
	| {
			kind: "tag-status"
			tag: AdminExamTag
			action: "archive" | "restore"
			trigger: HTMLButtonElement
	  }
	| { kind: "create-category"; trigger: HTMLButtonElement }
	| {
			kind: "edit-category"
			category: AdminExamCategory
			trigger: HTMLButtonElement
	  }
	| {
			kind: "category-status"
			category: AdminExamCategory
			action: "archive" | "restore"
			trigger: HTMLButtonElement
	  }
	| null

export function ClassificationManagementPage() {
	const navigation = useClassificationManagementNavigation()
	const [dialog, setDialog] = useState<DialogState>(null)

	useEffect(() => setDialog(null), [navigation.state.tab])

	function openCreate(trigger: HTMLButtonElement) {
		setDialog(
			navigation.state.tab === "tags"
				? { kind: "create-tag", trigger }
				: { kind: "create-category", trigger }
		)
	}

	return (
		<main className="min-w-0 flex-1 px-3 py-5 sm:px-5 lg:px-8">
			<div className="mx-auto max-w-[96rem] space-y-5">
				<ClassificationManagementHeader
					tab={navigation.state.tab}
					onTabChange={navigation.actions.setTab}
					onCreate={openCreate}
				/>

				{navigation.state.tab === "tags" ? (
					<TagManagement
						state={navigation.state}
						search={navigation.search}
						actions={navigation.actions}
						onCreate={openCreate}
						onEdit={(tag, trigger) => setDialog({ kind: "edit-tag", tag, trigger })}
						onStatus={(tag, action, trigger) =>
							setDialog({ kind: "tag-status", tag, action, trigger })
						}
					/>
				) : (
					<CategoryManagement
						state={navigation.state}
						search={navigation.search}
						actions={navigation.actions}
						onCreate={openCreate}
						onEdit={(category, trigger) =>
							setDialog({ kind: "edit-category", category, trigger })
						}
						onStatus={(category, action, trigger) =>
							setDialog({ kind: "category-status", category, action, trigger })
						}
					/>
				)}
			</div>

			{(dialog?.kind === "create-tag" || dialog?.kind === "edit-tag") && (
				<TagFormDialog
					open
					tag={dialog.kind === "edit-tag" ? dialog.tag : null}
					restoreFocusTo={dialog.trigger}
					onOpenChange={(open) => {
						if (!open) setDialog(null)
					}}
				/>
			)}
			{dialog?.kind === "tag-status" && (
				<TagStatusDialog
					open
					tag={dialog.tag}
					action={dialog.action}
					restoreFocusTo={dialog.trigger}
					onOpenChange={(open) => {
						if (!open) setDialog(null)
					}}
				/>
			)}
			{(dialog?.kind === "create-category" ||
				dialog?.kind === "edit-category") && (
				<CategoryFormDialog
					open
					category={dialog.kind === "edit-category" ? dialog.category : null}
					restoreFocusTo={dialog.trigger}
					onOpenChange={(open) => {
						if (!open) setDialog(null)
					}}
				/>
			)}
			{dialog?.kind === "category-status" && (
				<CategoryStatusDialog
					open
					category={dialog.category}
					action={dialog.action}
					restoreFocusTo={dialog.trigger}
					onOpenChange={(open) => {
						if (!open) setDialog(null)
					}}
				/>
			)}
		</main>
	)
}

export function ClassificationManagementPageFallback() {
	return (
		<main className="min-w-0 flex-1 px-3 py-5 sm:px-5 lg:px-8">
			<div className="mx-auto max-w-[96rem] space-y-5">
				<div className="space-y-3 border-b pb-5">
					<Skeleton className="h-7 w-64" />
					<Skeleton className="h-4 w-full max-w-xl" />
					<Skeleton className="h-9 w-56" />
				</div>
				<Skeleton className="h-20 w-full" />
				<Skeleton className="h-96 w-full" />
			</div>
		</main>
	)
}
