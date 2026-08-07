"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
	ArrowLeftIcon,
	FloppyDiskIcon,
	ListIcon,
	SlidersIcon,
	SpinnerGapIcon,
	WarningIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert"
import { Badge } from "@/components/shadcn/badge"
import { Button } from "@/components/shadcn/button"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/shadcn/dialog"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/shadcn/sheet"
import type { AdminExamSummary } from "../../types/exam.types"
import { calculateQuestionCount, calculateTotalPoints } from "../model/builder-derived"
import type { BuilderValidationError } from "../model/builder.types"
import { usePublishExamBuilder } from "../publish/exam-builder-publish"
import { useExamBuilderSaveAll } from "../save/exam-builder-save"
import {
	useBuilderActions,
	useBuilderDocument,
	useBuilderPublishStatus,
	useBuilderSaveStatus,
	useBuilderSelection,
	useBuilderValidation,
	useBuilderVersion,
	useShouldBlockBuilderNavigation,
} from "../store/exam-builder.store"
import { useReloadLatestExamBuilder } from "../hooks/use-exam-builder-initialization"
import { ExamBuilderEditor } from "./exam-builder-editor"
import { ExamBuilderOutline } from "./exam-builder-outline"

const time = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
})

export function ExamBuilderShell({ exam }: { exam: AdminExamSummary }) {
	const router = useRouter()
	const document = useBuilderDocument()
	const version = useBuilderVersion()
	const save = useBuilderSaveStatus()
	const publishStatus = useBuilderPublishStatus()
	const actions = useBuilderActions()
	const shouldBlock = useShouldBlockBuilderNavigation()
	const saveAll = useExamBuilderSaveAll()
	const publish = usePublishExamBuilder()
	const reload = useReloadLatestExamBuilder()
	const [outlineOpen, setOutlineOpen] = useState(false)
	const [settingsOpen, setSettingsOpen] = useState(false)
	const [confirm, setConfirm] = useState<"publish" | "reload" | "leave" | null>(null)
	if (!document || !version) return null
	const currentDocument = document
	const readOnly = version.status !== "draft" || document.examArchived
	async function manualSave() {
		const result = await saveAll("manual")
		if (result.status === "success" || result.status === "noop")
			toast.success(
				result.status === "noop" ? "Everything is already saved." : "All changes saved.",
			)
		else if (result.status === "failed")
			toast.error("Save failed. Your staged changes are still here.")
	}
	async function confirmPublish() {
		setConfirm(null)
		const result = await publish()
		if (result.status === "success")
			toast.success("Draft published. This version is now read-only.")
		else if (result.status === "validation-error") {
			focusFirstError(actions.validate("publish"), actions)
			toast.error("Complete the publication requirements first.")
		} else toast.error("The Draft could not be published.")
	}
	async function confirmReload() {
		setConfirm(null)
		try {
			await reload(
				currentDocument.version.examId,
				currentDocument.version.id.slice(7),
				exam.isArchived,
			)
			toast.success("Latest server version loaded.")
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Reload failed.")
		}
	}
	function leave() {
		if (shouldBlock) setConfirm("leave")
		else router.push("/exams")
	}
	const disabled =
		readOnly || save.isSaving || Boolean(save.conflict) || Boolean(save.reconciliation)
	return (
		<main className="flex min-h-0 flex-1 flex-col bg-muted/20">
			<header className="sticky top-0 z-20 border-b bg-background px-3 py-3 sm:px-5">
				<div className="flex flex-wrap items-center gap-3">
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Back to Exam Management"
						onClick={leave}
					>
						<ArrowLeftIcon />
					</Button>
					<div className="min-w-0 flex-1">
						<p className="truncate text-xs text-muted-foreground">
							{exam.title} · Version {version.versionNumber}
						</p>
						<h1 className="truncate font-semibold">
							{version.title || "Untitled version"}
						</h1>
					</div>
					<Badge variant={version.status === "draft" ? "secondary" : "outline"}>
						{version.status[0].toUpperCase() + version.status.slice(1)}
					</Badge>
					<SaveStatus />
					<div className="flex gap-2 lg:hidden">
						<Button
							size="icon-sm"
							variant="outline"
							aria-label="Open outline"
							onClick={() => setOutlineOpen(true)}
						>
							<ListIcon />
						</Button>
						<Button
							size="icon-sm"
							variant="outline"
							aria-label="Open settings"
							onClick={() => setSettingsOpen(true)}
						>
							<SlidersIcon />
						</Button>
					</div>
					{!readOnly && (
						<>
							<Button
								variant="outline"
								disabled={disabled}
								onClick={() => void manualSave()}
							>
								{save.isSaving ? (
									<SpinnerGapIcon className="animate-spin" />
								) : (
									<FloppyDiskIcon />
								)}
								Save All
							</Button>
							<Button
								disabled={disabled || publishStatus === "publishing"}
								onClick={() => {
									const errors = actions
										.validate("publish")
										.filter((error) => error.code !== "total_score_mismatch")
									if (errors.length) {
										focusFirstError(errors, actions)
										toast.error("Fix publication validation errors first.")
									} else setConfirm("publish")
								}}
							>
								{publishStatus === "publishing" && (
									<SpinnerGapIcon className="animate-spin" />
								)}
								Publish
							</Button>
						</>
					)}
				</div>
			</header>
			{readOnly && (
				<Alert className="border-x-0">
					<AlertTitle>Read-only {version.status} version</AlertTitle>
					<AlertDescription>
						{document.examArchived
							? "This Exam is archived and cannot be changed."
							: `This ${version.status} version is available for inspection only. Clone it from Version Control to create an editable Draft.`}
					</AlertDescription>
				</Alert>
			)}
			{save.conflict && (
				<BlockingBanner
					title="Conflict detected"
					text="Another session changed this Draft. Your local staged values are preserved, but Save and Publish are disabled."
					onReload={() => setConfirm("reload")}
				/>
			)}
			{save.reconciliation && (
				<BlockingBanner
					title="Reconciliation required"
					text="Some server operations may have succeeded. Blind retry and Publish are disabled; reload the canonical version before continuing."
					onReload={() => setConfirm("reload")}
				/>
			)}
			{save.status === "failed" && (
				<Alert variant="destructive" className="border-x-0">
					<WarningIcon />
					<AlertTitle>Save failed</AlertTitle>
					<AlertDescription>
						{save.message || "Your staged changes are preserved."}
					</AlertDescription>
				</Alert>
			)}
			<div className="grid min-h-0 flex-1 lg:grid-cols-[19rem_minmax(0,1fr)_17rem]">
				<aside className="hidden min-h-0 border-r bg-background lg:block">
					<ExamBuilderOutline readOnly={readOnly} />
				</aside>
				<section className="min-w-0 overflow-y-auto bg-background">
					<ExamBuilderEditor readOnly={readOnly} />
				</section>
				<aside className="hidden min-h-0 overflow-y-auto border-l bg-background p-4 lg:block">
					<BuilderSettings />
				</aside>
			</div>
			<Sheet open={outlineOpen} onOpenChange={setOutlineOpen}>
				<SheetContent side="left" className="w-[90vw]">
					<SheetHeader>
						<SheetTitle>Exam outline</SheetTitle>
						<SheetDescription>Sections, questions, and Group children.</SheetDescription>
					</SheetHeader>
					<div className="min-h-0 flex-1">
						<ExamBuilderOutline
							readOnly={readOnly}
							onSelect={() => setOutlineOpen(false)}
						/>
					</div>
				</SheetContent>
			</Sheet>
			<Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
				<SheetContent side="right" className="w-[90vw]">
					<SheetHeader>
						<SheetTitle>Contextual settings</SheetTitle>
						<SheetDescription>Selection facts and validation.</SheetDescription>
					</SheetHeader>
					<div className="overflow-y-auto p-4">
						<BuilderSettings />
					</div>
				</SheetContent>
			</Sheet>
			<ConfirmDialog
				kind={confirm}
				onClose={() => setConfirm(null)}
				onConfirm={() => {
					if (confirm === "publish") void confirmPublish()
					else if (confirm === "reload") void confirmReload()
					else {
						setConfirm(null)
						router.push("/exams")
					}
				}}
			/>
		</main>
	)
}

function SaveStatus() {
	const save = useBuilderSaveStatus()
	let label = "Saved"
	if (save.isSaving) label = "Saving…"
	else if (save.status === "unsaved") label = "Unsaved changes"
	else if (save.status === "failed") label = "Save failed"
	else if (save.status === "conflict") label = "Conflict detected"
	else if (save.status === "reconciliation-required") label = "Reconciliation required"
	else if (save.lastSuccessfulSaveAt && save.lastSuccessfulSaveTrigger === "auto")
		label = `Autosaved ${time.format(new Date(save.lastSuccessfulSaveAt))}`
	return (
		<span role="status" aria-live="polite" className="text-xs text-muted-foreground">
			{label}
		</span>
	)
}
function BuilderSettings() {
	const document = useBuilderDocument()
	const selection = useBuilderSelection()
	const validation = useBuilderValidation()
	if (!document) return null
	const errors = validation.publish.filter(
		(error) =>
			!error.entityId ||
			selection.type === "version" ||
			Object.values(selection).includes(error.entityId),
	)
	const questionCount = document.sectionIds.reduce(
		(total, id) => total + calculateQuestionCount(document, id),
		0,
	)
	return (
		<div className="space-y-5">
			<div>
				<h2 className="font-semibold">Document summary</h2>
				<dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
					<div>
						<dt className="text-muted-foreground">Sections</dt>
						<dd className="text-lg">{document.sectionIds.length}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">Questions</dt>
						<dd className="text-lg">{questionCount}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">Total points</dt>
						<dd className="text-lg">{calculateTotalPoints(document)}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">Revision</dt>
						<dd className="text-lg">{document.contentRevision}</dd>
					</div>
				</dl>
			</div>
			<div>
				<h2 className="font-semibold">Validation</h2>
				{errors.length ? (
					<ul className="mt-2 space-y-2 text-xs text-destructive">
						{errors.map((error, index) => (
							<li key={`${error.code}-${index}`}>{error.message}</li>
						))}
					</ul>
				) : (
					<p className="mt-2 text-sm text-muted-foreground">
						No errors for the current selection.
					</p>
				)}
			</div>
		</div>
	)
}
function BlockingBanner({
	title,
	text,
	onReload,
}: {
	title: string
	text: string
	onReload: () => void
}) {
	return (
		<Alert variant="destructive" className="border-x-0">
			<WarningIcon />
			<AlertTitle>{title}</AlertTitle>
			<AlertDescription className="flex flex-wrap items-center justify-between gap-3">
				<span>{text}</span>
				<Button variant="outline" onClick={onReload}>
					Reload Latest Version
				</Button>
			</AlertDescription>
		</Alert>
	)
}
function ConfirmDialog({
	kind,
	onClose,
	onConfirm,
}: {
	kind: "publish" | "reload" | "leave" | null
	onClose: () => void
	onConfirm: () => void
}) {
	const content =
		kind === "publish"
			? {
					title: "Publish this Draft?",
					text: "The version becomes read-only. If another version is currently Published, the server will retire it as part of publication.",
					action: "Publish",
				}
			: kind === "reload"
				? {
						title: "Discard staged changes?",
						text: "Reloading the latest server version permanently discards all local staged values. The server will not be overwritten.",
						action: "Reload latest",
					}
				: {
						title: "Leave the Exam Builder?",
						text: "Unsaved, saving, conflicted, or reconciliation-blocked work may be lost.",
						action: "Leave",
					}
	return (
		<Dialog
			open={kind !== null}
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{content.title}</DialogTitle>
					<DialogDescription>{content.text}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
					<Button
						variant={kind === "publish" ? "default" : "destructive"}
						onClick={onConfirm}
					>
						{content.action}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
function focusFirstError(
	errors: BuilderValidationError[],
	actions: ReturnType<typeof useBuilderActions>,
) {
	const first = errors[0]
	if (!first) return
	if (first.entity === "section" && first.entityId)
		actions.setSelection({ type: "section", sectionId: first.entityId })
	else if (first.entity === "question" && first.entityId)
		actions.setSelection({ type: "question", questionId: first.entityId })
	else if (first.entity === "option" && first.entityId)
		actions.setSelection({ type: "option", optionId: first.entityId })
	else if (first.entity === "answer-key" && first.entityId)
		actions.setSelection({ type: "answer-key", answerKeyId: first.entityId })
	else actions.setSelection({ type: "version" })
	window.requestAnimationFrame(() => {
		const container = document.querySelector<HTMLElement>(
			`[data-builder-field="${CSS.escape(first.field)}"]`,
		)
		;(
			container?.querySelector<HTMLElement>(
				"input, select, textarea, button, [contenteditable='true']",
			) ?? container
		)?.focus()
	})
}
