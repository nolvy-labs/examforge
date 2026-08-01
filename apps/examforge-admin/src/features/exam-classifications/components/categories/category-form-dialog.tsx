"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { SpinnerGapIcon } from "@phosphor-icons/react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Checkbox } from "@/components/shadcn/checkbox"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/shadcn/field"
import { Input } from "@/components/shadcn/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select"
import { Textarea } from "@/components/shadcn/textarea"
import {
	useAdminExamTags,
	useCreateAdminExamCategoryMutation,
	useUpdateAdminExamCategoryMutation,
} from "@/features/exam-classifications/hooks/exam-classification.hook"
import { getClassificationActionErrorMessage } from "@/features/exam-classifications/model/classification-management-error"
import { suggestClassificationSlug } from "@/features/exam-classifications/model/classification-presentation"
import {
	EXAM_CATEGORY_DISPLAY_ORDER_MAX,
	EXAM_CATEGORY_DISPLAY_ORDER_MIN,
	EXAM_CLASSIFICATION_DESCRIPTION_MAX_LENGTH,
	EXAM_CLASSIFICATION_NAME_MAX_LENGTH,
	EXAM_CLASSIFICATION_SLUG_MAX_LENGTH,
	EXAM_CATEGORY_MATCH_MODE_LABELS,
	examCategoryFormSchema,
	mapExamCategoryFormToCreateRequest,
} from "@/features/exam-classifications/types/exam-classification.schema"
import type {
	AdminExamCategory,
	ExamCategoryFormInput,
	ExamCategoryFormValues,
} from "@/features/exam-classifications/types/exam-classification.types"
import { ApiError } from "@/lib/api/api.error"

import { ClassificationTagMultiSelect } from "../shared/classification-tag-multi-select"

const emptyValues: ExamCategoryFormInput = {
	name: "",
	slug: "",
	description: "",
	matchMode: 1,
	isFeatured: false,
	displayOrder: 0,
	examTagIds: [],
}

interface Props {
	open: boolean
	category: AdminExamCategory | null
	restoreFocusTo: HTMLButtonElement | null
	onOpenChange: (open: boolean) => void
}

function sameIds(left: readonly string[], right: readonly string[]) {
	return [...left].sort().join(",") === [...right].sort().join(",")
}

export function CategoryFormDialog({ open, category, restoreFocusTo, onOpenChange }: Props) {
	const tagsQuery = useAdminExamTags({ includeArchived: true })
	const createMutation = useCreateAdminExamCategoryMutation()
	const updateMutation = useUpdateAdminExamCategoryMutation()
	const [formError, setFormError] = useState<string | null>(null)
	const slugManuallyEdited = useRef(false)
	const submissionPending = useRef(false)
	const form = useForm<ExamCategoryFormInput, unknown, ExamCategoryFormValues>({
		resolver: zodResolver(examCategoryFormSchema),
		defaultValues: emptyValues,
	})
	const pending = createMutation.isPending || updateMutation.isPending
	const allTags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data])

	useEffect(() => {
		if (!open) return
		form.reset(category ? {
			name: category.name,
			slug: category.slug,
			description: category.description,
			matchMode: category.matchMode === 0 ? 1 : category.matchMode,
			isFeatured: category.isFeatured,
			displayOrder: category.displayOrder,
			examTagIds: category.tags.map((tag) => tag.id),
		} : emptyValues)
		slugManuallyEdited.current = Boolean(category)
		setFormError(null)
	}, [category, form, open])

	function restoreFocus() {
		window.requestAnimationFrame(() => restoreFocusTo?.focus())
	}

	function changeOpen(next: boolean) {
		if (pending) return
		onOpenChange(next)
		if (!next) {
			form.reset(emptyValues)
			setFormError(null)
			restoreFocus()
		}
	}

	function attachFieldErrors(error: ApiError) {
		for (const name of ["name", "slug", "description", "matchMode", "isFeatured", "displayOrder", "examTagIds"] as const) {
			const message = error.getFieldMessages(name)?.[0]
			if (message) form.setError(name, { type: "server", message })
		}
	}

	async function submit(values: ExamCategoryFormValues) {
		if (pending || submissionPending.current) return
		submissionPending.current = true
		setFormError(null)

		try {
			if (category) {
				const originalIds = category.tags.map((tag) => tag.id)
				const tagsChanged = !sameIds(originalIds, values.examTagIds)
				const unavailableSelected = values.examTagIds.filter(
					(id) => {
						const tag = allTags.find((candidate) => candidate.id === id)
						return !tag || tag.isArchived
					}
				)
				if (tagsChanged && unavailableSelected.length) {
					form.setError("examTagIds", {
						type: "manual",
						message: "Remove archived or unavailable tag associations before changing the tag selection.",
					})
					return
				}

				await updateMutation.mutateAsync({
					id: category.id,
					request: {
						name: values.name,
						slug: values.slug.trim() || null,
						description: values.description,
						matchMode: values.matchMode,
						isFeatured: values.isFeatured,
						displayOrder: values.displayOrder,
						examTagIds: tagsChanged ? values.examTagIds : null,
					},
				})
			} else {
				await createMutation.mutateAsync(mapExamCategoryFormToCreateRequest(values))
			}

			toast.success(`“${values.name}” was ${category ? "updated" : "created"}.`)
			form.reset(emptyValues)
			onOpenChange(false)
			restoreFocus()
		} catch (error) {
			if (error instanceof ApiError) {
				attachFieldErrors(error)
				if (error.code === "conflict") form.setError("slug", { type: "server", message: error.message })
				if (error.missingOrArchivedTagIds.length) {
					form.setError("examTagIds", { type: "server", message: "Tag availability changed. Review the selected tags and retry." })
					await tagsQuery.refetch()
				}
			}
			setFormError(getClassificationActionErrorMessage(error, "category", category ? "update" : "create"))
		} finally {
			submissionPending.current = false
		}
	}

	const nameRegistration = form.register("name")
	const slugRegistration = form.register("slug")

	return <Dialog open={open} onOpenChange={changeOpen}><DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl" showCloseButton={!pending}><DialogHeader><DialogTitle>{category ? "Edit category" : "Create category"}</DialogTitle><DialogDescription>{category ? "Update the category rule and discovery metadata." : "Create a category that groups exams using tag matching rules."}</DialogDescription></DialogHeader><form noValidate onSubmit={form.handleSubmit(submit)}><FieldGroup>
		<Field data-invalid={Boolean(form.formState.errors.name)}><FieldLabel htmlFor="exam-category-name">Name</FieldLabel><Input id="exam-category-name" maxLength={EXAM_CLASSIFICATION_NAME_MAX_LENGTH} autoFocus aria-invalid={Boolean(form.formState.errors.name)} {...nameRegistration} onChange={(event) => { void nameRegistration.onChange(event); if (!slugManuallyEdited.current) form.setValue("slug", suggestClassificationSlug(event.target.value), { shouldValidate: form.formState.isSubmitted }) }} /><FieldDescription>Required. Up to {EXAM_CLASSIFICATION_NAME_MAX_LENGTH} characters.</FieldDescription><FieldError errors={[form.formState.errors.name]} /></Field>
		<Field data-invalid={Boolean(form.formState.errors.slug)}><FieldLabel htmlFor="exam-category-slug">Slug</FieldLabel><Input id="exam-category-slug" maxLength={EXAM_CLASSIFICATION_SLUG_MAX_LENGTH} autoCapitalize="none" spellCheck={false} aria-invalid={Boolean(form.formState.errors.slug)} {...slugRegistration} onChange={(event) => { slugManuallyEdited.current = true; void slugRegistration.onChange(event) }} /><FieldDescription>{category ? "Leave blank to keep the existing slug." : "Optional. Suggested from the name and remains editable."}</FieldDescription><FieldError errors={[form.formState.errors.slug]} /></Field>
		<Field data-invalid={Boolean(form.formState.errors.description)}><FieldLabel htmlFor="exam-category-description">Description</FieldLabel><Textarea id="exam-category-description" rows={4} maxLength={EXAM_CLASSIFICATION_DESCRIPTION_MAX_LENGTH} aria-invalid={Boolean(form.formState.errors.description)} {...form.register("description")} /><FieldDescription>Required. Up to {EXAM_CLASSIFICATION_DESCRIPTION_MAX_LENGTH.toLocaleString()} characters.</FieldDescription><FieldError errors={[form.formState.errors.description]} /></Field>
		<Controller control={form.control} name="matchMode" render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor="exam-category-match-mode">Match mode</FieldLabel><Select value={String(field.value)} onValueChange={(value) => field.onChange(value === "2" ? 2 : 1)}><SelectTrigger id="exam-category-match-mode" className="w-full" aria-invalid={fieldState.invalid}><SelectValue>{EXAM_CATEGORY_MATCH_MODE_LABELS[field.value]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="1">All tags</SelectItem><SelectItem value="2">Any tag</SelectItem></SelectContent></Select><FieldDescription>{field.value === 1 ? "An exam must contain every associated tag." : "An exam must contain at least one associated tag."}</FieldDescription><FieldError errors={[fieldState.error]} /></Field>} />
		<Controller control={form.control} name="displayOrder" render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor="exam-category-display-order">Display order</FieldLabel><Input id="exam-category-display-order" type="number" min={EXAM_CATEGORY_DISPLAY_ORDER_MIN} max={EXAM_CATEGORY_DISPLAY_ORDER_MAX} step={1} value={Number.isNaN(field.value) ? "" : field.value} onChange={(event) => field.onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))} aria-invalid={fieldState.invalid} /><FieldDescription>Any 32-bit integer from {EXAM_CATEGORY_DISPLAY_ORDER_MIN.toLocaleString()} to {EXAM_CATEGORY_DISPLAY_ORDER_MAX.toLocaleString()}.</FieldDescription><FieldError errors={[fieldState.error]} /></Field>} />
		<Controller control={form.control} name="isFeatured" render={({ field, fieldState }) => <Field orientation="horizontal" data-invalid={fieldState.invalid}><Checkbox id="exam-category-featured" checked={field.value} onCheckedChange={field.onChange} /><div><FieldLabel htmlFor="exam-category-featured">Featured category</FieldLabel><FieldDescription>Featured categories receive priority in student discovery.</FieldDescription></div><FieldError errors={[fieldState.error]} /></Field>} />
		<Controller control={form.control} name="examTagIds" render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid}><FieldLabel>Associated tags</FieldLabel><ClassificationTagMultiSelect tags={allTags} originalTags={category?.tags} selectedIds={field.value} onChange={field.onChange} disabled={tagsQuery.isPending || tagsQuery.isError} /><FieldDescription>Optional. Only active tags can be newly selected.</FieldDescription>{tagsQuery.isPending && <p className="text-xs text-muted-foreground" role="status">Loading active tags...</p>}{tagsQuery.isError && <p className="text-xs text-destructive">Active tags could not be loaded. Retry before changing associations.</p>}<FieldError errors={[fieldState.error]} /></Field>} />
		{formError && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}
	</FieldGroup><DialogFooter className="mt-6"><DialogClose render={<Button type="button" variant="outline" />} disabled={pending}>Cancel</DialogClose><Button type="submit" disabled={pending}>{pending && <SpinnerGapIcon className="animate-spin" />}{pending ? "Saving…" : category ? "Save changes" : "Create category"}</Button></DialogFooter></form></DialogContent></Dialog>
}
