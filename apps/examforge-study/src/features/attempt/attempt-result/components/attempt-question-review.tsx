import { ChevronDown } from "lucide-react"

import type { AttemptDetail, AttemptQuestion } from "../../types/attempt.type"
import { getQuestionType } from "../../types/attempt.type"
import { AttemptAnswerReview } from "./attempt-answer-review"

interface AttemptQuestionReviewProps {
	sections: AttemptDetail["sections"]
	showGrading: boolean
}

export function AttemptQuestionReview({
	sections,
	showGrading,
}: AttemptQuestionReviewProps) {
	return (
		<section className="mt-8">
			<h2 id="review-heading" className="text-xl font-semibold">
				Question review
			</h2>
			<p className="mt-1 text-sm text-slate-600">
				{showGrading
					? "Expand a question to review your answer and the authoritative solution."
					: "This abandoned attempt shows persisted answers only; grading and solutions are unavailable."}
			</p>
			<div className="mt-4 space-y-3">
				{sections.flatMap((section) =>
					section.questions.map((question, index) => (
						<AttemptQuestionResult
							key={question.id}
							question={question}
							label={`${section.title} · Question ${index + 1}`}
							showGrading={showGrading}
						/>
					))
				)}
			</div>
		</section>
	)
}

interface AttemptQuestionResultProps {
	question: AttemptQuestion
	label: string
	showGrading: boolean
}

function AttemptQuestionResult({
	question,
	label,
	showGrading,
}: AttemptQuestionResultProps) {
	const group = getQuestionType(question.type) === "group"

	return (
		<details className="group rounded-2xl border bg-white shadow-sm">
			<summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
				<div className="min-w-0">
					<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
						{label}
					</p>
					<p className="mt-1 truncate font-medium text-slate-900">
						{question.prompt}
					</p>
				</div>
				<ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" />
			</summary>
			<div className="border-t p-5">
				<p className="whitespace-pre-line text-sm leading-7 text-slate-800">
					{question.prompt}
				</p>
				{group ? (
					<div className="mt-5 space-y-5">
						{question.childQuestions.map((child, index) => (
							<div key={child.id} className="rounded-xl border p-4">
								<p className="text-xs font-semibold text-slate-500">
									Part {index + 1}
								</p>
								<p className="mt-2 text-sm font-medium">{child.prompt}</p>
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
			</div>
		</details>
	)
}
