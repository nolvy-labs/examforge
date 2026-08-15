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
import {
	RichTextRenderer,
	richTextToPlainText,
} from "@/components/common/rich-text-renderer"
import { Card, CardContent } from "@/components/shadcn/card"
import { FieldGroup } from "@/components/shadcn/field"
import { Fragment } from "react/jsx-runtime"
import { Separator } from "@/components/shadcn/separator"
import { Badge } from "@/components/shadcn/badge"
import { RadioGroup, RadioGroupItem } from "@/components/shadcn/radio-group"
import { LocaleMessage } from "@/components/locale/locale-message"
import { useLocale, useTranslations } from "next-intl"

interface AttemptQuestionBlockProps {
	question: AttemptQuestion
	number: string
}

export function AttemptQuestionBlock({
	question,
	number,
}: AttemptQuestionBlockProps) {
	const locale = useLocale()
	const translate = useTranslations("exams")
	const type = getQuestionType(question.type)

	return (
		<Card id={`question-${question.id}`} className="scroll-mt-24 p-0">
			<CardContent className="p-2 lg:p-4">
				<div className="flex items-start gap-2">
					<Badge className="aspect-square size-8">
						{number}
					</Badge>
					<div className="min-w-0 flex-1">
						<RichTextRenderer content={question.prompt} className="text-base font-medium text-neutral-950 dark:text-neutral-50" />
						{type !== "group" && (
							<p className="mt-1 text-xs text-neutral-500">
								{translate("points", { count: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(question.points) })}
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
											<RichTextRenderer content={child.prompt} className="mt-1 min-w-0 flex-1" />
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
					<LocaleMessage messageId="attempt.clearAnswer" />
				</Button>
			</div>
		)
	}

	if (type === "multiple-choice-single") {
		return (
			<RadioGroup value={selected.length > 0 ? selected[0] : ""} onValueChange={(value) => setOptions(question.id, [value])}>
				{question.options.map((option) => (
					<AnswerOptionRow
						key={option.id}
						label={option.label}
						content={option.text}
						onSelect={() => setOptions(question.id, [option.id])}
						control={<RadioGroupItem value={option.id} id={option.id} aria-label={option.label ?? richTextToPlainText(option.text)} />}
					/>
				))}
				<Button
					variant="link"
					size="xs"
					disabled={!selected.length}
					className={"ml-auto"}
					onClick={() => setOptions(question.id, [])}
				>
					<LocaleMessage messageId="attempt.clearAnswer" />
				</Button>
			</RadioGroup>
		)
	}

	return (
		<FieldGroup className="gap-2">
			{question.options.map((option) => {
				const checked = selected.includes(option.id)
				return (
					<AnswerOptionRow
						key={option.id}
						label={option.label}
						content={option.text}
						onSelect={() =>
							setOptions(
								question.id,
								checked
									? selected.filter((id) => id !== option.id)
									: [...selected, option.id]
							)
						}
						control={<Checkbox
								checked={checked}
								aria-label={option.label ?? richTextToPlainText(option.text)}
								onCheckedChange={(next) =>
									setOptions(
										question.id,
										next
											? [...selected, option.id]
											: selected.filter((id) => id !== option.id)
									)
								}
							/>}
					/>
				)
			})}
			<Button
				variant="link"
				size="xs"
				disabled={!selected.length}
				className={"ml-auto"}
				onClick={() => setOptions(question.id, [])}
			>
				<LocaleMessage messageId="attempt.clearAnswer" />
			</Button>
		</FieldGroup>
	)
}

interface AnswerOptionRowProps {
	label: string | null
	content: string
	control: React.ReactNode
	onSelect: () => void
}

function AnswerOptionRow({ label, content, control, onSelect }: AnswerOptionRowProps) {
	return (
		<div
			className="flex w-full cursor-pointer items-start gap-3 rounded-md border p-3"
			onClick={(event) => {
				const target = event.target as Element
				if (!target.closest("a, [data-slot='checkbox'], [data-slot='radio-group-item']")) onSelect()
			}}
		>
			{control}
			<div className="flex min-w-0 flex-1 items-start gap-2">
				{label && <span className="text-sm font-medium">{label}</span>}
				<RichTextRenderer content={content} className="min-w-0 flex-1 text-sm text-muted-foreground" />
			</div>
		</div>
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
	const translate = useTranslations("attempt")

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
							const answerState = translate(answered ? "answered" : incomplete ? "partiallyAnswered" : "unanswered")
							return (
								<Button
									key={question.id}
									type="button"
									variant="outline"
									size="icon"
									aria-label={translate("questionState", { number: questionIndex + 1, state: answerState })}
									onClick={() => onSelect(section.id, question.id)}
									className={cn(
										"aspect-square h-auto w-full rounded-lg text-xs font-semibold",
										answered && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary",
										incomplete && "bg-warning/20 text-warning hover:bg-warning/30 hover:text-warning",
										displayMode === "one" && selectedBlockId === question.id && "ring-2 ring-primary ring-offset-1",
										failed && "outline-2 outline-dashed outline-neutral-20"
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
	const translate = useTranslations("attempt")
	const { saveState: state } = useAttemptSaveStatus()
	const config = {
		saved: { label: translate("synchronized"), icon: CheckCircle2 },
		waiting: { label: translate("savedLocally"), icon: Circle },
		saving: { label: translate("saving"), icon: LoaderCircle },
		failed: { label: translate("synchronizationFailed"), icon: TriangleAlert },
		offline: { label: translate("offlineUnsaved"), icon: Save },
	}[state]
	const Icon = config.icon
	return (
		<div title={config.label} className="flex items-center gap-1.5 text-xs text-neutral-600" role="status">
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
				<span><LocaleMessage messageId="attempt.saveFailed" /></span>
				{saveState === "failed" && (
					<Button type="button" size="sm" variant="outline" onClick={onRetry}>
						<LocaleMessage messageId="attempt.retrySave" />
					</Button>
				)}
			</AlertDescription>
		</Alert>
	)
}
