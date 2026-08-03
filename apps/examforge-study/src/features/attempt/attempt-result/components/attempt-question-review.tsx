import { ChevronDown } from "lucide-react"

import type { AttemptDetail, AttemptQuestion, GradingStatus } from "../../types/attempt.type"
import { getQuestionType } from "../../types/attempt.type"
import { AttemptAnswerReview } from "./attempt-answer-review"
import { Card, CardContent, CardHeader } from "@/components/shadcn/card"
import ContentRenderer from "@/components/common/content-renderer"
import { Separator } from "@/components/shadcn/separator"
import { Badge } from "@/components/shadcn/badge"
import { useCallback, useMemo, useState } from "react"
import { Button } from "@/components/shadcn/button"

interface AttemptQuestionReviewProps {
	sections: AttemptDetail["sections"]
	showGrading: boolean
}

export function AttemptQuestionReview({
	sections,
	showGrading,
}: AttemptQuestionReviewProps) {
	return (
		<section className="flex flex-col w-full gap-4 mt-8">
			<h2 id="review-heading" className="text-xl font-semibold">
				Question review
			</h2>
			{sections.flatMap((section) =>
				section.questions.map((question, index) => (
					<AttemptQuestionResult
						key={question.id}
						question={question}
						label={`${section.title}`}
						questionIndex={index + 1}
						showGrading={showGrading}
					/>
				))
			)}
		</section>
	)
}

interface AttemptQuestionResultProps {
	question: AttemptQuestion
	label: string
	questionIndex: number
	showGrading: boolean
}

function AttemptQuestionResult({
	question,
	label,
	questionIndex,
	showGrading,
}: AttemptQuestionResultProps) {
	const [isOpen, setIsOpen] = useState(false)

	const group = getQuestionType(question.type) === "group"

	const status: GradingStatus | null = useMemo(() => {
		if (group) {
			if (question.childQuestions.every((child) => child.answer?.gradingStatus === "correct")) {
				return "correct"
			} else if (question.childQuestions.every((child) => child.answer?.gradingStatus === "incorrect")) {
				return "incorrect"
			} else if (question.childQuestions.every((child) => child.answer?.gradingStatus === "unanswered")) {
				return "unanswered"
			} else if (question.childQuestions.some((child) => child.answer?.gradingStatus === "correct" || child.answer?.gradingStatus === "partially-correct")) {
				return "partially-correct"
			}
			return null;
		}
		return question.answer?.gradingStatus ?? null
	}, [question])

	const statusLabel = useCallback((status: GradingStatus | null) => {
		switch (status) {
			case "correct":
				return <p className="text-green-500">Correct</p>
			case "incorrect":
				return <p className="text-red-500">Incorrect</p>
			case "partially-correct":
				return <p className="text-yellow-500">Partially correct</p>
			case "unanswered":
				return <p className="text-gray-500">Unanswered</p>
			default:
				return <p className="text-slate-500">Ungraded</p>
		}
	}, [])

	return (
		<Card className="p-6">
			<CardHeader className="w-full p-0 gap-0" onClick={() => setIsOpen((isOpen) => !isOpen)}>
				<summary className="flex flex-row items-start w-full cursor-pointer list-none gap-3">
					<QuestionBadge status={status} content={`${questionIndex}`} />
					<div className="min-w-0">
						<div className="text-xs font-medium uppercase tracking-wide text-slate-500">
							{statusLabel(status)}
						</div>
						<div className="mt-1 truncate font-medium text-slate-900 whitespace-break-spaces">
							<ContentRenderer content={question.prompt} />
						</div>
					</div>
					<Button variant="ghost" size="icon-sm" className="ml-auto">
						{isOpen ? <ChevronDown className="transition-transform group-open:rotate-180 rotate-180" /> : <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" />}
					</Button>
				</summary>
			</CardHeader>
			{isOpen && <Separator />}
			{isOpen && <CardContent className="p-0">
				{group ? (
					<div className="flex flex-col w-full gap-4">
						{question.childQuestions.map((child, index) => (
							<div key={child.id} className="flex flex-col p-4 gap-4 rounded-xl border">
								<div className="flex flex-row items-start justify-start w-full gap-3">
									<QuestionBadge status={child.answer?.gradingStatus ?? null} content={`${questionIndex}.${index + 1}`} />
									<div className="min-w-0">
										<div className="text-xs font-medium uppercase tracking-wide text-slate-500">
											<ContentRenderer content={label} />
										</div>
										<div className="text-sm font-medium whitespace-break-spaces">
											<ContentRenderer content={child.prompt} />
										</div>
									</div>
								</div>
								<Separator />
								<AttemptAnswerReview
									question={child}
									showGrading={showGrading}
								/>
							</div>
						))}
					</div>
				) : (
					<AttemptAnswerReview question={question} showGrading={showGrading} />
				)}
			</CardContent>}
		</Card>
	)
}

interface QuestionBadgeProps {
	status: GradingStatus | null
	content: string
}

function QuestionBadge({ status, content }: QuestionBadgeProps) {
	switch (status) {
		case "correct":
			return <Badge className="aspect-square size-8 bg-green-500">{content}</Badge>
		case "incorrect":
			return <Badge className="aspect-square size-8 bg-red-500">{content}</Badge>
		case "partially-correct":
			return <Badge className="aspect-square size-8 bg-yellow-500">{content}</Badge>
		case "unanswered":
			return <Badge className="aspect-square size-8 bg-gray-500">{content}</Badge>
		default:
			return <Badge className="aspect-square size-8">{content}</Badge>
	}
}