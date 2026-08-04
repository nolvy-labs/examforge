"use client"

import { CheckCircle2, Circle, LoaderCircle, Save, TriangleAlert } from "lucide-react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Checkbox } from "@/components/shadcn/checkbox"
import { Input } from "@/components/shadcn/input"
import { cn } from "@/lib/utils"

import {
	useAttemptActions,
	useAttemptAnswer,
	useAttemptAnswers,
	useAttemptLocked,
	useAttemptNavigation,
	useAttemptSaveStatus,
} from "../stores/attempt.store"
import type { AttemptQuestion, AttemptSection } from "../../types/attempt.type"
import { getQuestionType } from "../../types/attempt.type"
import { Button } from "@/components/shadcn/button"
import ContentRenderer from "@/components/common/content-renderer"
import { Card, CardContent } from "@/components/shadcn/card"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/shadcn/field"
import { Fragment } from "react/jsx-runtime"
import { Separator } from "@/components/shadcn/separator"
import { Badge } from "@/components/shadcn/badge"
import { RadioGroup, RadioGroupItem } from "@/components/shadcn/radio-group"

interface AttemptQuestionBlockProps {
	question: AttemptQuestion
	number: string
}

export function AttemptQuestionBlock({
	question,
	number,
}: AttemptQuestionBlockProps) {
	const type = getQuestionType(question.type)

	return (
		<Card id={`question-${question.id}`} className="scroll-mt-24 p-0">
			<CardContent className="p-2 lg:p-4">
				<div className="flex items-start gap-2">
					<Badge className="aspect-square size-8">
						{number}
					</Badge>
					<div className="min-w-0 flex-1">
						<div className="whitespace-pre-line wrap-break-word text-base font-medium leading-7 text-slate-950">
							<ContentRenderer content={question.prompt} />
						</div>
						{type !== "group" && (
							<p className="mt-1 text-xs text-slate-500">
								{question.points} {question.points === 1 ? "point" : "points"}
							</p>
						)}
					</div>
				</div>
				<div className="mt-5">
					{type === "group" ? (
						<div className="flex flex-col gap-6">
							{question.childQuestions.map((child, index) => (
								<Fragment key={child.id}>
									<div className="flex flex-col gap-4">
										<div className="flex flex-row gap-2">
											<Badge className="aspect-square size-7 text-xs">
												{number}.{index + 1}
											</Badge>
											<p className="whitespace-break-spaces mt-1">
												<ContentRenderer content={child.prompt} />
											</p>
										</div>
										<QuestionEditor question={child} />
									</div>
									{index < question.childQuestions.length - 1 && <Separator />}
								</Fragment>
							))}
						</div>
					) : (
						<QuestionEditor question={question} />
					)}
				</div>
			</CardContent>
		</Card>
	)
}

function QuestionEditor({ question }: { question: AttemptQuestion }) {
	const type = getQuestionType(question.type)
	const answer = useAttemptAnswer(question.id)
	const locked = useAttemptLocked()
	const { setText, setOptions } = useAttemptActions()
	const selected = answer?.selectedOptionIds ?? []

	if (type === "fill-blank") {
		return (
			<div className="flex flex-col w-full gap-2">
				<Input
					id={`answer-${question.id}`}
					value={answer?.textAnswer ?? ""}
					disabled={locked}
					onChange={(event) =>
						setText(question.id, event.target.value === "" ? null : event.target.value)
					}
					className="min-h-11"
				/>
				<Button
					variant="link"
					size="xs"
					disabled={!answer?.textAnswer || locked}
					className="ml-auto"
					onClick={() => setText(question.id, null)}
				>
					Clear answer
				</Button>
			</div>
		)
	}

	if (type === "multiple-choice-single") {
		return (
			<RadioGroup value={selected.length > 0 ? selected[0] : ""} onValueChange={(value) => setOptions(question.id, [value])}>
				{question.options.map((option) => {
					return (
						<FieldLabel key={option.id}>
							<Field orientation="horizontal">
								<RadioGroupItem value={option.id} id={option.id} />
								<FieldContent className="flex-row gap-2 items-start justify-start">
									<FieldTitle>
										<ContentRenderer content={option.label || ""} />
									</FieldTitle>
									<FieldDescription className="whitespace-break-spaces">
										<ContentRenderer content={option.text} />
									</FieldDescription>
								</FieldContent>
							</Field>
						</FieldLabel>
					)
				})}
				<Button
					variant="link"
					size="xs"
					disabled={!selected.length}
					className={"ml-auto"}
					onClick={() => setOptions(question.id, [])}
				>
					Clear answer
				</Button>
			</RadioGroup>
		)
	}

	return (
		<FieldGroup className="gap-2">
			{question.options.map((option) => {
				const checked = selected.includes(option.id)
				return (
					<FieldLabel key={option.id}>
						<Field orientation="horizontal">
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
							/>
							<FieldContent className="flex-row gap-2 items-start justify-start">
								<FieldTitle>
									<ContentRenderer content={option.label || ""} />
								</FieldTitle>
								<FieldDescription className="whitespace-break-spaces">
									<ContentRenderer content={option.text} />
								</FieldDescription>
							</FieldContent>
						</Field>
					</FieldLabel>
				)
			})}
			<Button
				variant="link"
				size="xs"
				disabled={!selected.length}
				className={"ml-auto"}
				onClick={() => setOptions(question.id, [])}
			>
				Clear answer
			</Button>
		</FieldGroup>
	)
}

interface AttemptNavigatorProps {
	sections: AttemptSection[]
	onSelect: (sectionId: string, blockId: string) => void
}

export function AttemptNavigator({
	sections,
	onSelect,
}: AttemptNavigatorProps) {

	const { selectedSectionId, selectedBlockId, displayMode } = useAttemptNavigation()
	const { drafts, dirty } = useAttemptAnswers()
	const { saveState } = useAttemptSaveStatus()

	return (
		<nav className="space-y-5">
			{sections.map((section, sectionIndex) => (
				<div key={section.id}>
					<Button
						type="button"
						variant={selectedSectionId === section.id ? "default" : "ghost"}
						size="sm"
						onClick={() => onSelect(section.id, section.questions[0]?.id ?? "")}
						className="w-full justify-start px-2 text-left font-semibold"
					>
						{sectionIndex + 1}. {section.title}
					</Button>
					<div className="mt-2 grid grid-cols-5 gap-2">
						{section.questions.map((question, questionIndex) => {
							const isGroup = getQuestionType(question.type) === "group"
							const ids =
								isGroup
									? question.childQuestions.map((child) => child.id)
									: [question.id]
							const answeredCount = ids.filter((id) => {
								const answer = drafts[id]
								return Boolean(
									answer?.textAnswer?.trim() || answer?.selectedOptionIds.length
								)
							}).length
							const answered = ids.length > 0 && answeredCount === ids.length
							const incomplete = isGroup && answeredCount > 0 && !answered
							const failed =
								ids.some((id) => dirty[id]) &&
								(saveState === "failed" || saveState === "offline")
							const answerState = answered
								? "answered"
								: incomplete
									? "partially answered"
									: "unanswered"
							return (
								<Button
									key={question.id}
									type="button"
									variant="outline"
									size="icon"
									aria-label={`Question ${questionIndex + 1}, ${answerState}`}
									onClick={() => onSelect(section.id, question.id)}
									className={cn(
										"aspect-square h-auto w-full rounded-lg text-xs font-semibold",
										answered && "bg-blue-100 text-blue-800 hover:bg-blue-200",
										incomplete && "bg-yellow-100 text-yellow-900 hover:bg-yellow-200",
										displayMode === "one" && selectedBlockId === question.id && "ring-2 ring-indigo-600 ring-offset-1",
										failed && "outline-2 outline-dashed outline-slate-400"
									)}
								>
									{questionIndex + 1}
								</Button>
							)
						})}
					</div>
				</div>
			))}
		</nav>
	)
}

export function SaveStatus() {
	const { saveState: state, saveMessage: message } = useAttemptSaveStatus()
	const config = {
		saved: { label: "Synchronized", icon: CheckCircle2 },
		waiting: { label: "Saved locally", icon: Circle },
		saving: { label: "Saving...", icon: LoaderCircle },
		failed: { label: "Synchronization failed", icon: TriangleAlert },
		offline: { label: "Offline - unsaved", icon: Save },
	}[state]
	const Icon = config.icon
	return (
		<div title={message} className="flex items-center gap-1.5 text-xs text-slate-600" role="status">
			<Icon className={cn("size-4", state === "saving" && "animate-spin")} />
			<span>{config.label}</span>
		</div>
	)
}

export function SaveError({ onRetry }: { onRetry: () => void }) {
	const { saveState, saveMessage: message } = useAttemptSaveStatus()
	if (!message || (saveState !== "failed" && !message.startsWith("Local storage"))) return null
	return (
		<Alert variant="destructive">
			<AlertDescription className="flex flex-wrap items-center justify-between gap-3">
				<span>{message}</span>
				{saveState === "failed" && (
					<Button type="button" size="sm" variant="outline" onClick={onRetry}>
						Retry synchronization
					</Button>
				)}
			</AlertDescription>
		</Alert>
	)
}
