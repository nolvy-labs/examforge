"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { SpinnerGapIcon } from "@phosphor-icons/react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
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
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/shadcn/field"
import { Input } from "@/components/shadcn/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/shadcn/select"
import { Textarea } from "@/components/shadcn/textarea"
import type { AdminExamTag } from "@/features/exam-classifications/types/exam-classification.types"
import { ApiError } from "@/lib/api/api.error"

import {
	EXAM_DESCRIPTION_MAX_LENGTH,
	EXAM_MAX_TAGS,
	EXAM_TITLE_MAX_LENGTH,
	mapQuickCreateExamToRequest,
	quickCreateExamFormSchema,
} from "../../types/exam.schema"
import type {
	CreateExamRequest,
	CreateExamResponse,
	QuickCreateExamFormInput,
	QuickCreateExamFormValues,
} from "../../types/exam.types"
import { getExamActionErrorMessage } from "../model/exam-management-error"
import { ExamTagMultiSelect } from "./exam-tag-multi-select"

const defaultValues: QuickCreateExamFormInput = {
	title: "",
	description: "",
	type: 0,
	tagIds: [],
}

interface Props {
	open: boolean
	activeTags: AdminExamTag[]
	tagsUnavailable: boolean
	restoreFocusTo: HTMLButtonElement | null
	onOpenChange: (open: boolean) => void
	onCreate: (request: CreateExamRequest) => Promise<CreateExamResponse>
	onRefreshTags: () => Promise<unknown> | void
}

export function QuickCreateExamDialog({
	open,
	activeTags,
	tagsUnavailable,
	restoreFocusTo,
	onOpenChange,
	onCreate,
	onRefreshTags,
}: Props) {
	const router = useRouter()
	const [formError, setFormError] = useState<string | null>(null)
	const form = useForm<
		QuickCreateExamFormInput,
		unknown,
		QuickCreateExamFormValues
	>({
		resolver: zodResolver(quickCreateExamFormSchema),
		defaultValues,
	})
	const isSubmitting = form.formState.isSubmitting

	function restoreFocus() {
		window.requestAnimationFrame(() => restoreFocusTo?.focus())
	}

	function changeOpen(nextOpen: boolean) {
		if (isSubmitting) return
		onOpenChange(nextOpen)
		if (!nextOpen) {
			form.reset(defaultValues)
			setFormError(null)
			restoreFocus()
		}
	}

	function attachFieldErrors(error: ApiError) {
		const fields = [
			{ name: "title" as const, aliases: ["title", "examDetail.title"] },
			{
				name: "description" as const,
				aliases: ["description", "examDetail.description"],
			},
			{ name: "type" as const, aliases: ["type", "examDetail.type"] },
			{ name: "tagIds" as const, aliases: ["tagIds"] },
		]

		for (const field of fields) {
			const message = field.aliases.flatMap(
				(alias) => error.getFieldMessages(alias) ?? []
			)[0]
			if (message) form.setError(field.name, { type: "server", message })
		}
	}

	async function submit(values: QuickCreateExamFormValues) {
		if (isSubmitting) return
		setFormError(null)

		try {
			const request = mapQuickCreateExamToRequest(values)
			const created = await onCreate(request)
			form.reset(defaultValues)
			onOpenChange(false)
			toast.success(`“${values.title}” was created.`)
			if (!created.initialVersion) {
				toast.error("The Exam was created, but its initial Draft was not returned. Open Version Control to continue.")
				restoreFocus()
				return
			}
			try {
				router.push(`/exams/${created.id}/version/${created.initialVersion.id}/edit`)
			} catch {
				toast.error("The Exam was created, but navigation failed. Open Version Control to continue.")
				restoreFocus()
			}
		} catch (error) {
			if (error instanceof ApiError) {
				attachFieldErrors(error)
				if (error.missingOrArchivedTagIds.length > 0) {
					setFormError(
						"Tag information changed. Review the unavailable selections and retry."
					)
					await onRefreshTags()
					return
				}
			}
			setFormError(getExamActionErrorMessage(error, "create"))
		}
	}

	return (
		<Dialog open={open} onOpenChange={changeOpen}>
			<DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg" showCloseButton={!isSubmitting}>
				<DialogHeader>
					<DialogTitle>Create exam</DialogTitle>
					<DialogDescription>
						Create the Exam and its initial empty Draft, then continue in the Exam Builder.
					</DialogDescription>
				</DialogHeader>

				<form noValidate onSubmit={form.handleSubmit(submit)}>
					<FieldGroup>
						<Field data-invalid={Boolean(form.formState.errors.title)}>
							<FieldLabel htmlFor="quick-exam-title">Title</FieldLabel>
							<Input
								id="quick-exam-title"
								maxLength={EXAM_TITLE_MAX_LENGTH}
								autoFocus
								aria-invalid={Boolean(form.formState.errors.title)}
								aria-describedby="quick-exam-title-description"
								{...form.register("title")}
							/>
							<FieldDescription id="quick-exam-title-description">
								Required. Up to {EXAM_TITLE_MAX_LENGTH} characters.
							</FieldDescription>
							<FieldError errors={[form.formState.errors.title]} />
						</Field>

						<Field data-invalid={Boolean(form.formState.errors.description)}>
							<FieldLabel htmlFor="quick-exam-description">Description</FieldLabel>
							<Textarea
								id="quick-exam-description"
								maxLength={EXAM_DESCRIPTION_MAX_LENGTH}
								rows={4}
								aria-invalid={Boolean(form.formState.errors.description)}
								{...form.register("description")}
							/>
							<FieldDescription>
								Optional. Up to {EXAM_DESCRIPTION_MAX_LENGTH.toLocaleString()} characters.
							</FieldDescription>
							<FieldError errors={[form.formState.errors.description]} />
						</Field>

						<Controller
							control={form.control}
							name="type"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor="quick-exam-type">Type</FieldLabel>
									<Select
										value={String(field.value ?? 0)}
										onValueChange={(value) => field.onChange(value === "1" ? 1 : 0)}
									>
										<SelectTrigger id="quick-exam-type" className="w-full" aria-invalid={fieldState.invalid}>
											<SelectValue>
												{field.value === 1 ? "IELTS" : "Simple"}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="0">Simple</SelectItem>
											<SelectItem value="1">IELTS</SelectItem>
										</SelectContent>
									</Select>
									<FieldError errors={[fieldState.error]} />
								</Field>
							)}
						/>

						<Controller
							control={form.control}
							name="tagIds"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>Tags</FieldLabel>
									<ExamTagMultiSelect
										tags={activeTags}
										selectedIds={field.value ?? []}
										onChange={field.onChange}
										includeArchived={false}
										disabled={tagsUnavailable}
										maxSelected={EXAM_MAX_TAGS}
										label="Select active exam tags"
									/>
									<FieldDescription>
										Optional. Select up to {EXAM_MAX_TAGS} active tags.
									</FieldDescription>
									<FieldError errors={[fieldState.error]} />
								</Field>
							)}
						/>

						{formError && (
							<Alert variant="destructive">
								<AlertDescription>{formError}</AlertDescription>
							</Alert>
						)}
					</FieldGroup>

					<DialogFooter className="mt-6">
						<DialogClose render={<Button type="button" variant="outline" />} disabled={isSubmitting}>
							Cancel
						</DialogClose>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting && <SpinnerGapIcon className="animate-spin" />}
							{isSubmitting ? "Creating…" : "Create exam"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
