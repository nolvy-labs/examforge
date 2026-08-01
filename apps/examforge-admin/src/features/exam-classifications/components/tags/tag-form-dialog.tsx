"use client"

import { useEffect, useRef, useState } from "react"
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
import {
	useCreateAdminExamTagMutation,
	useUpdateAdminExamTagMutation,
} from "@/features/exam-classifications/hooks/exam-classification.hook"
import { getClassificationActionErrorMessage } from "@/features/exam-classifications/model/classification-management-error"
import { suggestClassificationSlug } from "@/features/exam-classifications/model/classification-presentation"
import {
	EXAM_CLASSIFICATION_DESCRIPTION_MAX_LENGTH,
	EXAM_CLASSIFICATION_NAME_MAX_LENGTH,
	EXAM_CLASSIFICATION_SLUG_MAX_LENGTH,
	EXAM_TAG_TYPE_LABELS,
	examTagFormSchema,
	mapExamTagFormToCreateRequest,
} from "@/features/exam-classifications/types/exam-classification.schema"
import type {
	AdminExamTag,
	ExamTagFormInput,
	ExamTagFormValues,
} from "@/features/exam-classifications/types/exam-classification.types"
import { ApiError } from "@/lib/api/api.error"

const emptyValues: ExamTagFormInput = {
	name: "",
	slug: "",
	description: "",
	type: 1,
}

interface Props {
	open: boolean
	tag: AdminExamTag | null
	restoreFocusTo: HTMLButtonElement | null
	onOpenChange: (open: boolean) => void
}

export function TagFormDialog({
	open,
	tag,
	restoreFocusTo,
	onOpenChange,
}: Props) {
	const createMutation = useCreateAdminExamTagMutation()
	const updateMutation = useUpdateAdminExamTagMutation()
	const [formError, setFormError] = useState<string | null>(null)
	const slugManuallyEdited = useRef(false)
	const submissionPending = useRef(false)
	const form = useForm<ExamTagFormInput, unknown, ExamTagFormValues>({
		resolver: zodResolver(examTagFormSchema),
		defaultValues: emptyValues,
	})
	const pending = createMutation.isPending || updateMutation.isPending

	useEffect(() => {
		if (!open) return
		form.reset(
			tag
				? {
						name: tag.name,
						slug: tag.slug,
						description: tag.description,
						type: tag.type === 0 ? 1 : tag.type,
					}
				: emptyValues
		)
		slugManuallyEdited.current = Boolean(tag)
		setFormError(null)
	}, [form, open, tag])

	function restoreFocus() {
		window.requestAnimationFrame(() => restoreFocusTo?.focus())
	}

	function changeOpen(nextOpen: boolean) {
		if (pending) return
		onOpenChange(nextOpen)
		if (!nextOpen) {
			form.reset(emptyValues)
			setFormError(null)
			restoreFocus()
		}
	}

	function attachFieldErrors(error: ApiError) {
		for (const name of ["name", "slug", "description", "type"] as const) {
			const message = error.getFieldMessages(name)?.[0]
			if (message) form.setError(name, { type: "server", message })
		}
	}

	async function submit(values: ExamTagFormValues) {
		if (pending || submissionPending.current) return
		submissionPending.current = true
		setFormError(null)

		try {
			if (tag) {
				await updateMutation.mutateAsync({
					id: tag.id,
					request: {
						name: values.name,
						slug: values.slug.trim() || null,
						description: values.description,
						type: values.type,
					},
				})
			} else {
				await createMutation.mutateAsync(mapExamTagFormToCreateRequest(values))
			}

			toast.success(`“${values.name}” was ${tag ? "updated" : "created"}.`)
			form.reset(emptyValues)
			onOpenChange(false)
			restoreFocus()
		} catch (error) {
			if (error instanceof ApiError) {
				attachFieldErrors(error)
				if (error.code === "conflict") {
					form.setError("slug", { type: "server", message: error.message })
				}
			}
			setFormError(
				getClassificationActionErrorMessage(
					error,
					"tag",
					tag ? "update" : "create"
				)
			)
		} finally {
			submissionPending.current = false
		}
	}

	const nameRegistration = form.register("name")
	const slugRegistration = form.register("slug")

	return (
		<Dialog open={open} onOpenChange={changeOpen}>
			<DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg" showCloseButton={!pending}>
				<DialogHeader>
					<DialogTitle>{tag ? "Edit tag" : "Create tag"}</DialogTitle>
					<DialogDescription>
						{tag
							? "Update the tag metadata used by exams and categories."
							: "Create a reusable tag for classifying exams and categories."}
					</DialogDescription>
				</DialogHeader>

				<form noValidate onSubmit={form.handleSubmit(submit)}>
					<FieldGroup>
						<Field data-invalid={Boolean(form.formState.errors.name)}>
							<FieldLabel htmlFor="exam-tag-name">Name</FieldLabel>
							<Input
								id="exam-tag-name"
								maxLength={EXAM_CLASSIFICATION_NAME_MAX_LENGTH}
								autoFocus
								aria-invalid={Boolean(form.formState.errors.name)}
								{...nameRegistration}
								onChange={(event) => {
									void nameRegistration.onChange(event)
									if (!slugManuallyEdited.current) {
										form.setValue(
											"slug",
											suggestClassificationSlug(event.target.value),
											{ shouldValidate: form.formState.isSubmitted }
										)
									}
								}}
							/>
							<FieldDescription>Required. Up to {EXAM_CLASSIFICATION_NAME_MAX_LENGTH} characters.</FieldDescription>
							<FieldError errors={[form.formState.errors.name]} />
						</Field>

						<Field data-invalid={Boolean(form.formState.errors.slug)}>
							<FieldLabel htmlFor="exam-tag-slug">Slug</FieldLabel>
							<Input
								id="exam-tag-slug"
								maxLength={EXAM_CLASSIFICATION_SLUG_MAX_LENGTH}
								autoCapitalize="none"
								spellCheck={false}
								aria-invalid={Boolean(form.formState.errors.slug)}
								{...slugRegistration}
								onChange={(event) => {
									slugManuallyEdited.current = true
									void slugRegistration.onChange(event)
								}}
							/>
							<FieldDescription>
								{tag
									? "Leave blank to keep the existing slug."
									: "Optional. Suggested from the name and remains editable."}
							</FieldDescription>
							<FieldError errors={[form.formState.errors.slug]} />
						</Field>

						<Field data-invalid={Boolean(form.formState.errors.description)}>
							<FieldLabel htmlFor="exam-tag-description">Description</FieldLabel>
							<Textarea id="exam-tag-description" rows={4} maxLength={EXAM_CLASSIFICATION_DESCRIPTION_MAX_LENGTH} aria-invalid={Boolean(form.formState.errors.description)} {...form.register("description")} />
							<FieldDescription>May be empty. Up to {EXAM_CLASSIFICATION_DESCRIPTION_MAX_LENGTH.toLocaleString()} characters.</FieldDescription>
							<FieldError errors={[form.formState.errors.description]} />
						</Field>

						<Controller control={form.control} name="type" render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor="exam-tag-type">Type</FieldLabel>
								<Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
									<SelectTrigger id="exam-tag-type" className="w-full" aria-invalid={fieldState.invalid}><SelectValue>{EXAM_TAG_TYPE_LABELS[field.value]}</SelectValue></SelectTrigger>
									<SelectContent>{([1, 2, 3, 4, 5, 6, 7] as const).map((type) => <SelectItem key={type} value={String(type)}>{EXAM_TAG_TYPE_LABELS[type]}</SelectItem>)}</SelectContent>
								</Select>
								<FieldError errors={[fieldState.error]} />
							</Field>
						)} />

						{formError && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}
					</FieldGroup>
					<DialogFooter className="mt-6">
						<DialogClose render={<Button type="button" variant="outline" />} disabled={pending}>Cancel</DialogClose>
						<Button type="submit" disabled={pending}>{pending && <SpinnerGapIcon className="animate-spin" />}{pending ? "Saving…" : tag ? "Save changes" : "Create tag"}</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
