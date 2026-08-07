"use client"

import { TrashIcon, ArrowUpIcon, ArrowDownIcon, PlusIcon } from "@phosphor-icons/react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Checkbox } from "@/components/shadcn/checkbox"
import { Input } from "@/components/shadcn/input"
import { Label } from "@/components/shadcn/label"

import { plainTextToRichText } from "../model/rich-text"
import type {
	BuilderEntityId,
	BuilderQuestion,
	BuilderValidationError,
	RichTextValue,
} from "../model/builder.types"
import {
	useBuilderActions,
	useBuilderAnswerKey,
	useBuilderDocument,
	useBuilderOption,
	useBuilderQuestion,
	useBuilderSection,
	useBuilderSelection,
	useBuilderValidation,
	useBuilderVersion,
} from "../store/exam-builder.store"
import { QUESTION_TYPE_LABELS, SECTION_KIND_LABELS } from "./builder-labels"
import { RichTextEditor } from "./rich-text/rich-text-editor"
import { RichTextRenderer } from "./rich-text/rich-text-renderer"

export function ExamBuilderEditor({ readOnly }: { readOnly: boolean }) {
	const selection = useBuilderSelection()
	if (selection.type === "version") return <VersionEditor readOnly={readOnly} />
	if (selection.type === "section")
		return <SectionEditor id={selection.sectionId} readOnly={readOnly} />
	if (selection.type === "question")
		return <QuestionEditor id={selection.questionId} readOnly={readOnly} />
	if (selection.type === "option")
		return <OptionEditor id={selection.optionId} readOnly={readOnly} />
	return <AnswerEditor id={selection.answerKeyId} readOnly={readOnly} />
}

function VersionEditor({ readOnly }: { readOnly: boolean }) {
	const version = useBuilderVersion()
	const actions = useBuilderActions()
	const errors = useErrors("version", version?.id)
	if (!version) return null
	return (
		<EditorCard
			title="Version settings"
			description="These fields belong to this version. Parent Exam metadata stays outside the builder."
		>
			<Field label="Title" id="version-title" error={fieldError(errors, "title")}>
				<Input
					id="version-title"
					data-builder-field="title"
					value={version.title}
					disabled={readOnly}
					onChange={(e) => actions.updateVersion({ title: e.target.value })}
				/>
			</Field>
			<RichField
				label="Description"
				id="version-description"
				value={version.description}
				readOnly={readOnly}
				error={fieldError(errors, "description")}
				onChange={(description) => actions.updateVersion({ description })}
			/>
			<RichField
				label="Instructions"
				id="version-instructions"
				value={version.instructions}
				readOnly={readOnly}
				error={fieldError(errors, "instructions")}
				onChange={(instructions) => actions.updateVersion({ instructions })}
			/>
			<Field
				label="Duration (minutes)"
				id="version-duration"
				error={fieldError(errors, "durationMinutes")}
			>
				<Input
					id="version-duration"
					type="number"
					min={0}
					max={1440}
					value={version.durationMinutes ?? ""}
					disabled={readOnly}
					onChange={(e) =>
						actions.updateVersion({
							durationMinutes: e.target.value === "" ? 0 : Number(e.target.value),
						})
					}
				/>
			</Field>
		</EditorCard>
	)
}

function SectionEditor({ id, readOnly }: { id: BuilderEntityId; readOnly: boolean }) {
	const section = useBuilderSection(id)
	const actions = useBuilderActions()
	const errors = useErrors("section", id)
	if (!section) return <Missing />
	return (
		<EditorCard
			title={section.title || "Untitled section"}
			description="Section content and delivery context."
		>
			<Field label="Title" id="section-title" error={fieldError(errors, "title")}>
				<Input
					id="section-title"
					value={section.title}
					disabled={readOnly}
					onChange={(e) => actions.updateSection(id, { title: e.target.value })}
				/>
			</Field>
			<Field label="Section kind" id="section-kind" error={fieldError(errors, "kind")}>
				<select
					id="section-kind"
					className="h-9 w-full border bg-background px-3"
					value={section.kind}
					disabled={readOnly}
					onChange={(e) =>
						actions.updateSection(id, {
							kind: Number(e.target.value) as 0 | 1 | 2 | 3 | 4 | 5,
						})
					}
				>
					{SECTION_KIND_LABELS.map((label, index) => (
						<option key={label} value={index}>
							{label}
						</option>
					))}
				</select>
			</Field>
			<RichField
				label="Instructions"
				id="section-instructions"
				value={section.instructions}
				readOnly={readOnly}
				error={fieldError(errors, "instructions")}
				onChange={(instructions) => actions.updateSection(id, { instructions })}
			/>
			<RichField
				label="Stimulus / context"
				id="section-stimulus"
				value={section.stimulusText ?? plainTextToRichText("")}
				readOnly={readOnly}
				error={fieldError(errors, "stimulusText")}
				onChange={(stimulusText) => actions.updateSection(id, { stimulusText })}
			/>
			<Field label="Media URL" id="section-media" error={fieldError(errors, "mediaUrl")}>
				<Input
					id="section-media"
					value={section.mediaUrl ?? ""}
					disabled={readOnly}
					onChange={(e) => actions.updateSection(id, { mediaUrl: e.target.value })}
				/>
			</Field>
		</EditorCard>
	)
}

function QuestionEditor({ id, readOnly }: { id: BuilderEntityId; readOnly: boolean }) {
	const question = useBuilderQuestion(id)
	const actions = useBuilderActions()
	const document = useBuilderDocument()
	const errors = useErrors("question", id)
	if (!question || !document) return <Missing />
	const typeOptions = (
		question.parentGroupId
			? ["single-choice", "multiple-choice", "fill-blank"]
			: ["single-choice", "multiple-choice", "fill-blank", "group"]
	) as BuilderQuestion["type"][]
	return (
		<EditorCard
			title={QUESTION_TYPE_LABELS[question.type]}
			description={question.parentGroupId ? "Child question" : "Top-level question"}
		>
			{!readOnly ? (
				<Field label="Question type" id="question-type">
					<select
						id="question-type"
						className="h-9 w-full border bg-background px-3"
						value={question.type}
						onChange={(e) => {
							if (
								!actions.changeQuestionType(id, e.target.value as BuilderQuestion["type"])
							)
								window.alert(
									"Remove existing options, answers, or children before changing question type.",
								)
						}}
					>
						{typeOptions.map((type) => (
							<option key={type} value={type}>
								{QUESTION_TYPE_LABELS[type]}
							</option>
						))}
					</select>
				</Field>
			) : null}
			<RichField
				label={question.type === "group" ? "Group context" : "Question content"}
				id="question-prompt"
				value={question.prompt}
				readOnly={readOnly}
				error={fieldError(errors, "prompt")}
				onChange={(prompt) => actions.updateQuestion(id, { prompt })}
			/>
			{question.type !== "group" ? (
				<Field label="Points" id="question-points" error={fieldError(errors, "points")}>
					<Input
						id="question-points"
						type="number"
						min="0"
						step="0.01"
						value={question.points}
						disabled={readOnly}
						onChange={(e) =>
							actions.updateQuestion(id, {
								points: e.target.value === "" ? 0 : Number(e.target.value),
							})
						}
					/>
				</Field>
			) : (
				<p className="text-sm text-muted-foreground">
					Group points are calculated from its child questions.
				</p>
			)}
			{question.type === "single-choice" || question.type === "multiple-choice" ? (
				<ChoiceEditor question={question} readOnly={readOnly} />
			) : null}
			{question.type === "fill-blank" ? (
				<FillEditor question={question} readOnly={readOnly} />
			) : null}
			{question.type === "group" ? (
				<GroupEditor question={question} readOnly={readOnly} />
			) : null}
			<RichField
				label="Explanation / solution"
				id="question-explanation"
				value={question.explanation ?? plainTextToRichText("")}
				readOnly={readOnly}
				error={fieldError(errors, "explanation")}
				onChange={(explanation) => actions.updateQuestion(id, { explanation })}
			/>
			<ErrorSummary errors={errors} />
		</EditorCard>
	)
}

function ChoiceEditor({
	question,
	readOnly,
}: {
	question: Extract<BuilderQuestion, { type: "single-choice" | "multiple-choice" }>
	readOnly: boolean
}) {
	const document = useBuilderDocument()
	const actions = useBuilderActions()
	if (!document) return null
	return (
		<section className="space-y-3" aria-labelledby="options-heading">
			<div className="flex items-center justify-between">
				<h3 id="options-heading" className="font-medium">
					Options
				</h3>
				{!readOnly && (
					<Button
						size="sm"
						variant="outline"
						onClick={() => actions.createOption(question.id)}
					>
						<PlusIcon />
						Add option
					</Button>
				)}
			</div>
			{question.optionIds.map((optionId, index) => {
				const option = document.optionsById[optionId]
				if (!option) return null
				const checked = question.correctOptionIds.includes(optionId)
				return (
					<div key={optionId} className="space-y-2 border p-3">
						<div className="flex items-center gap-2">
							<Checkbox
								aria-label={`Mark option ${index + 1} correct`}
								checked={checked}
								disabled={readOnly}
								onCheckedChange={(next) =>
									actions.setCorrectOptions(
										question.id,
										question.type === "single-choice"
											? next
												? [optionId]
												: []
											: next
												? [...question.correctOptionIds, optionId]
												: question.correctOptionIds.filter((id) => id !== optionId),
									)
								}
							/>
							<Input
								aria-label={`Option ${index + 1} label`}
								className="w-24"
								value={option.label ?? ""}
								disabled={readOnly}
								onChange={(e) =>
									actions.updateOption(optionId, { label: e.target.value })
								}
							/>
							{!readOnly && (
								<MoveDelete
									index={index}
									count={question.optionIds.length}
									label={`option ${index + 1}`}
									onMove={(direction) => actions.moveOption(optionId, direction)}
									onDelete={() => actions.deleteOption(optionId)}
								/>
							)}
						</div>
						<RichField
							label={`Option ${index + 1} content`}
							id={`option-${index}`}
							value={option.content}
							readOnly={readOnly}
							onChange={(content) => actions.updateOption(optionId, { content })}
						/>
						<RichField
							label={`Option ${index + 1} explanation`}
							id={`option-explanation-${index}`}
							value={option.explanation ?? plainTextToRichText("")}
							readOnly={readOnly}
							onChange={(explanation) => actions.updateOption(optionId, { explanation })}
						/>
					</div>
				)
			})}
			{question.optionIds.length === 0 && (
				<p className="text-sm text-muted-foreground">No options yet.</p>
			)}
		</section>
	)
}

function FillEditor({
	question,
	readOnly,
}: {
	question: Extract<BuilderQuestion, { type: "fill-blank" }>
	readOnly: boolean
}) {
	const document = useBuilderDocument()
	const actions = useBuilderActions()
	if (!document) return null
	return (
		<section className="space-y-3">
			<div className="flex justify-between">
				<h3 className="font-medium">Accepted answers</h3>
				{!readOnly && (
					<Button
						size="sm"
						variant="outline"
						onClick={() => actions.createAnswerKey(question.id)}
					>
						<PlusIcon />
						Add answer
					</Button>
				)}
			</div>
			{question.answerKeyIds.map((answerId, index) => {
				const answer = document.answerKeysById[answerId]
				if (!answer) return null
				return (
					<div key={answerId} className="flex flex-wrap items-center gap-2 border p-3">
						<Input
							className="min-w-48 flex-1 font-mono"
							aria-label={`Accepted answer ${index + 1}`}
							value={answer.acceptedAnswer}
							disabled={readOnly}
							onChange={(e) =>
								actions.updateAnswerKey(answerId, { acceptedAnswer: e.target.value })
							}
						/>
						<label className="flex items-center gap-2">
							<Checkbox
								checked={answer.isCaseSensitive}
								disabled={readOnly}
								onCheckedChange={(value) =>
									actions.updateAnswerKey(answerId, { isCaseSensitive: Boolean(value) })
								}
							/>
							Case sensitive
						</label>
						{!readOnly && (
							<Button
								size="icon-sm"
								variant="ghost"
								aria-label={`Delete accepted answer ${index + 1}`}
								onClick={() => actions.deleteAnswerKey(answerId)}
							>
								<TrashIcon />
							</Button>
						)}
					</div>
				)
			})}
			<p className="text-xs text-muted-foreground">
				Answers are canonical strings. LaTeX source is allowed; rich HTML is not.
			</p>
		</section>
	)
}

function GroupEditor({
	question,
	readOnly,
}: {
	question: Extract<BuilderQuestion, { type: "group" }>
	readOnly: boolean
}) {
	const document = useBuilderDocument()
	const actions = useBuilderActions()
	if (!document) return null
	return (
		<section className="space-y-3">
			<div className="flex flex-wrap justify-between gap-2">
				<h3 className="font-medium">Child questions</h3>
				{!readOnly && (
					<div className="flex gap-1">
						{(["single-choice", "multiple-choice", "fill-blank"] as const).map((type) => (
							<Button
								key={type}
								size="sm"
								variant="outline"
								onClick={() =>
									actions.createQuestion(question.sectionId, type, question.id)
								}
							>
								Add {QUESTION_TYPE_LABELS[type]}
							</Button>
						))}
					</div>
				)}
			</div>
			{question.childQuestionIds.map((id) => (
				<button
					type="button"
					key={id}
					className="block w-full border p-3 text-left hover:bg-muted"
					onClick={() => actions.setSelection({ type: "question", questionId: id })}
				>
					{QUESTION_TYPE_LABELS[document.questionsById[id]?.type ?? "fill-blank"]}
				</button>
			))}
			{!question.childQuestionIds.length && (
				<p className="text-sm text-muted-foreground">
					No child questions yet. Groups cannot contain another Group.
				</p>
			)}
		</section>
	)
}

function OptionEditor({ id, readOnly }: { id: BuilderEntityId; readOnly: boolean }) {
	const option = useBuilderOption(id)
	const actions = useBuilderActions()
	if (!option) return <Missing />
	return (
		<EditorCard title="Option" description="Choice option content.">
			<Field label="Label" id="option-label">
				<Input
					id="option-label"
					value={option.label ?? ""}
					disabled={readOnly}
					onChange={(e) => actions.updateOption(id, { label: e.target.value })}
				/>
			</Field>
			<RichField
				label="Content"
				id="option-content"
				value={option.content}
				readOnly={readOnly}
				onChange={(content) => actions.updateOption(id, { content })}
			/>
			<RichField
				label="Explanation"
				id="option-explanation"
				value={option.explanation ?? plainTextToRichText("")}
				readOnly={readOnly}
				onChange={(explanation) => actions.updateOption(id, { explanation })}
			/>
		</EditorCard>
	)
}
function AnswerEditor({ id, readOnly }: { id: BuilderEntityId; readOnly: boolean }) {
	const answer = useBuilderAnswerKey(id)
	const actions = useBuilderActions()
	if (!answer) return <Missing />
	return (
		<EditorCard
			title="Accepted answer"
			description="Machine-readable grading value; LaTeX source is allowed."
		>
			<Field label="Accepted answer" id="answer-value">
				<Input
					id="answer-value"
					className="font-mono"
					value={answer.acceptedAnswer}
					disabled={readOnly}
					onChange={(e) =>
						actions.updateAnswerKey(id, { acceptedAnswer: e.target.value })
					}
				/>
			</Field>
			<label className="flex items-center gap-2">
				<Checkbox
					checked={answer.isCaseSensitive}
					disabled={readOnly}
					onCheckedChange={(value) =>
						actions.updateAnswerKey(id, { isCaseSensitive: Boolean(value) })
					}
				/>
				Case sensitive
			</label>
		</EditorCard>
	)
}

function RichField({
	label,
	id,
	value,
	readOnly,
	error,
	onChange,
}: {
	label: string
	id: string
	value: RichTextValue
	readOnly: boolean
	error?: string
	onChange: (value: RichTextValue) => void
}) {
	return (
		<div className="space-y-2" data-builder-field={id.split("-").at(-1)}>
			<Label htmlFor={id}>{label}</Label>
			{readOnly ? (
				<div className="border p-3">
					<RichTextRenderer value={value} label={label} />
				</div>
			) : (
				<RichTextEditor
					id={id}
					label={label}
					value={value}
					onChange={onChange}
					invalid={Boolean(error)}
				/>
			)}
			{error && (
				<p className="text-xs text-destructive" role="alert">
					{error}
				</p>
			)}
		</div>
	)
}
function Field({
	label,
	id,
	error,
	children,
}: {
	label: string
	id: string
	error?: string
	children: React.ReactNode
}) {
	return (
		<div className="space-y-2" data-builder-field={id.split("-").at(-1)}>
			<Label htmlFor={id}>{label}</Label>
			{children}
			{error && (
				<p className="text-xs text-destructive" role="alert">
					{error}
				</p>
			)}
		</div>
	)
}
function EditorCard({
	title,
	description,
	children,
}: {
	title: string
	description: string
	children: React.ReactNode
}) {
	return (
		<article className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
			<header className="border-b pb-4">
				<h2 className="text-xl font-semibold">{title}</h2>
				<p className="text-sm text-muted-foreground">{description}</p>
			</header>
			{children}
		</article>
	)
}
function Missing() {
	return (
		<div className="p-8 text-center text-muted-foreground">
			The selected item no longer exists.
		</div>
	)
}
function useErrors(
	entity: BuilderValidationError["entity"],
	id?: BuilderEntityId | null,
) {
	const validation = useBuilderValidation()
	return validation.publish.filter(
		(error) => error.entity === entity && (!id || error.entityId === id),
	)
}
function fieldError(errors: BuilderValidationError[], field: string) {
	return errors.find((error) => error.field === field)?.message
}
function ErrorSummary({ errors }: { errors: BuilderValidationError[] }) {
	return errors.length ? (
		<Alert variant="destructive">
			<AlertDescription>
				<ul className="list-disc pl-4">
					{errors.map((error, index) => (
						<li key={`${error.code}-${index}`}>{error.message}</li>
					))}
				</ul>
			</AlertDescription>
		</Alert>
	) : null
}
function MoveDelete({
	index,
	count,
	label,
	onMove,
	onDelete,
}: {
	index: number
	count: number
	label: string
	onMove: (direction: -1 | 1) => void
	onDelete: () => void
}) {
	return (
		<div className="ml-auto flex">
			<Button
				size="icon-sm"
				variant="ghost"
				aria-label={`Move ${label} up`}
				disabled={index === 0}
				onClick={() => onMove(-1)}
			>
				<ArrowUpIcon />
			</Button>
			<Button
				size="icon-sm"
				variant="ghost"
				aria-label={`Move ${label} down`}
				disabled={index === count - 1}
				onClick={() => onMove(1)}
			>
				<ArrowDownIcon />
			</Button>
			<Button
				size="icon-sm"
				variant="ghost"
				aria-label={`Delete ${label}`}
				onClick={onDelete}
			>
				<TrashIcon />
			</Button>
		</div>
	)
}
