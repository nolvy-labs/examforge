"use client"

import { CheckCircle2, Circle, LoaderCircle, Save, TriangleAlert } from "lucide-react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Checkbox } from "@/components/shadcn/checkbox"
import { Input } from "@/components/shadcn/input"
import { cn } from "@/lib/utils"

import { useAttemptStore } from "../stores/attempt.store"
import type { AttemptQuestion, AttemptSection } from "../types/attempt.type"
import { getQuestionType } from "../types/attempt.type"

export function AttemptQuestionBlock({
	question,
	number,
}: {
	question: AttemptQuestion
	number: string
}) {
	const type = getQuestionType(question.type)
	return (
		<article
			id={`question-${question.id}`}
			className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
		>
			<div className="flex items-start gap-3">
				<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-700">
					{number}
				</span>
				<div className="min-w-0 flex-1">
					<p className="whitespace-pre-line break-words text-base font-medium leading-7 text-slate-950">
						{question.prompt}
					</p>
					{type !== "group" && (
						<p className="mt-1 text-xs text-slate-500">
							{question.points} {question.points === 1 ? "point" : "points"}
						</p>
					)}
				</div>
			</div>
			<div className="mt-5">
				{type === "group" ? (
					<div className="space-y-6">
						{question.childQuestions.map((child, index) => (
							<div key={child.id} className="border-t border-slate-100 pt-5">
								<p className="mb-3 text-sm font-semibold text-slate-700">
									{number}.{index + 1}
								</p>
								<QuestionEditor question={child} />
							</div>
						))}
					</div>
				) : (
					<QuestionEditor question={question} />
				)}
			</div>
		</article>
	)
}

function QuestionEditor({ question }: { question: AttemptQuestion }) {
	const type = getQuestionType(question.type)
	const answer = useAttemptStore((state) => state.drafts[question.id])
	const locked = useAttemptStore((state) => state.locked)
	const setText = useAttemptStore((state) => state.setText)
	const setOptions = useAttemptStore((state) => state.setOptions)
	const selected = answer?.selectedOptionIds ?? []

	if (type === "fill-blank") {
		return (
			<div>
				<label htmlFor={`answer-${question.id}`} className="text-sm font-medium text-slate-700">
					Your answer
				</label>
				<Input
					id={`answer-${question.id}`}
					value={answer?.textAnswer ?? ""}
					disabled={locked}
					onChange={(event) =>
						setText(question.id, event.target.value === "" ? null : event.target.value)
					}
					className="mt-2 min-h-11"
				/>
			</div>
		)
	}

	const multiple = type === "multiple-choice-multiple"
	return (
		<fieldset disabled={locked}>
			<legend className="sr-only">
				{multiple ? "Choose one or more answers" : "Choose one answer"}
			</legend>
			<div className="space-y-2">
				{question.options.map((option) => {
					const checked = selected.includes(option.id)
					return (
						<label
							key={option.id}
							className={cn(
								"flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-indigo-600",
								checked
									? "border-indigo-500 bg-indigo-50 text-indigo-950"
									: "border-slate-200 hover:bg-slate-50",
								locked && "cursor-not-allowed opacity-70"
							)}
						>
							{multiple ? (
								<Checkbox
									checked={checked}
									onCheckedChange={(next) =>
										setOptions(
											question.id,
											next
												? [...selected, option.id]
												: selected.filter((id) => id !== option.id)
										)
									}
									aria-label={option.text}
								/>
							) : (
								<input
									type="radio"
									name={`question-${question.id}`}
									checked={checked}
									onChange={() => setOptions(question.id, [option.id])}
									className="mt-0.5 size-4 accent-indigo-600"
								/>
							)}
							<span>
								{option.label && <strong className="mr-2">{option.label}</strong>}
								{option.text}
							</span>
						</label>
					)
				})}
			</div>
			{selected.length > 0 && (
				<button
					type="button"
					onClick={() => setOptions(question.id, [])}
					className="mt-3 rounded text-xs font-medium text-slate-600 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
				>
					Clear answer
				</button>
			)}
		</fieldset>
	)
}

export function AttemptNavigator({
	sections,
	onSelect,
}: {
	sections: AttemptSection[]
	onSelect: (sectionId: string, blockId: string) => void
}) {
	const selectedSectionId = useAttemptStore((state) => state.selectedSectionId)
	const selectedBlockId = useAttemptStore((state) => state.selectedBlockId)
	const drafts = useAttemptStore((state) => state.drafts)
	const dirty = useAttemptStore((state) => state.dirty)
	const saveState = useAttemptStore((state) => state.saveState)
	return (
		<nav aria-label="Exam questions" className="space-y-5">
			{sections.map((section, sectionIndex) => (
				<div key={section.id}>
					<button
						type="button"
						onClick={() => onSelect(section.id, section.questions[0]?.id ?? "")}
						className={cn(
							"w-full rounded-lg px-2 py-2 text-left text-sm font-semibold",
							selectedSectionId === section.id
								? "bg-slate-900 text-white"
								: "text-slate-700 hover:bg-slate-100"
						)}
					>
						{sectionIndex + 1}. {section.title}
					</button>
					<div className="mt-2 grid grid-cols-5 gap-2">
						{section.questions.map((question, questionIndex) => {
							const ids =
								getQuestionType(question.type) === "group"
									? question.childQuestions.map((child) => child.id)
									: [question.id]
							const answered = ids.every((id) => {
								const answer = drafts[id]
								return Boolean(
									answer?.textAnswer?.trim() || answer?.selectedOptionIds.length
								)
							})
							const saving =
								ids.some((id) => dirty[id]) &&
								(saveState === "saving" || saveState === "waiting")
							const failed =
								ids.some((id) => dirty[id]) &&
								(saveState === "failed" || saveState === "offline")
							return (
								<button
									key={question.id}
									type="button"
									aria-current={selectedBlockId === question.id ? "step" : undefined}
									aria-label={`Question ${questionIndex + 1}, ${
										failed ? "save failed" : saving ? "saving" : answered ? "answered" : "unanswered"
									}`}
									onClick={() => onSelect(section.id, question.id)}
									className={cn(
										"grid aspect-square place-items-center rounded-lg border text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
										selectedBlockId === question.id
											? "border-indigo-600 bg-indigo-600 text-white"
											: answered
												? "border-emerald-300 bg-emerald-50 text-emerald-800"
												: "border-slate-200 bg-white text-slate-600",
										failed && "border-red-400"
									)}
								>
									{questionIndex + 1}
								</button>
							)
						})}
					</div>
				</div>
			))}
		</nav>
	)
}

export function SaveStatus() {
	const state = useAttemptStore((workspace) => workspace.saveState)
	const message = useAttemptStore((workspace) => workspace.saveMessage)
	const config = {
		saved: { label: "All changes saved", icon: CheckCircle2 },
		waiting: { label: "Waiting to save", icon: Circle },
		saving: { label: "Saving…", icon: LoaderCircle },
		failed: { label: "Save failed", icon: TriangleAlert },
		offline: { label: "Offline — unsaved", icon: Save },
	}[state]
	const Icon = config.icon
	return (
		<div title={message} className="flex items-center gap-1.5 text-xs text-slate-600" role="status">
			<Icon
				className={cn("size-4", state === "saving" && "animate-spin")}
				aria-hidden="true"
			/>
			<span>{config.label}</span>
		</div>
	)
}

export function SaveError() {
	const message = useAttemptStore((state) => state.saveMessage)
	if (!message) return null
	return (
		<Alert variant="destructive">
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	)
}
