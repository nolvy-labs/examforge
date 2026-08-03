import { CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"

import type { AttemptQuestion } from "../../types/attempt.type"
import { getGradingStatus, getQuestionType } from "../../types/attempt.type"
import { formatAttemptNumber, getAnswerText } from "../model/attempt-result"
import { Fragment } from "react"

interface AttemptAnswerReviewProps {
	question: AttemptQuestion
	showGrading: boolean
}

export function AttemptAnswerReview({
	question,
	showGrading,
}: AttemptAnswerReviewProps) {
	const type = getQuestionType(question.type)
	const answer = question.answer
	const status = getGradingStatus(answer?.gradingStatus)

	return (
		<div className="space-y-4 text-sm">
			{(type === "multiple-choice-single" || type === "multiple-choice-multiple") && (
				<div className="rounded-xl bg-slate-50 p-4">
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Options
					</p>
					<ul className="mt-2 space-y-2">
						{question.options.map((option) => {
							const solution = question.solution?.options.find(
								(item) => item.optionId === option.id
							)
							return (
								<li key={option.id}>
									{option.label && `${option.label}. `}
									{option.text}
									{solution?.explanation && (
										<p className="mt-0.5 text-xs font-normal text-slate-600">
											{solution.explanation}
										</p>
									)}
								</li>
							)
						})}
					</ul>
				</div>
			)}

			<div className="rounded-xl bg-slate-50 p-4">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
					Your answer
				</p>
				<p className="mt-2 whitespace-pre-line text-slate-900">
					{getAnswerText(question)}
				</p>
			</div>
			{showGrading && (
				<Fragment>
					<div className="flex flex-wrap items-center gap-2">
						{status && <GradingBadge status={status} />}
						{answer?.awardedScore != null && answer.maximumScore != null && (
							<span className="text-xs font-medium text-slate-600">
								{formatAttemptNumber(answer.awardedScore)} /{" "}
								{formatAttemptNumber(answer.maximumScore)} points
							</span>
						)}
					</div>
					{question.solution && (
						<div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
								Correct solution
							</p>
							{type === "fill-blank" ? (
								<ul className="mt-2 list-inside list-disc text-slate-800">
									{question.solution.acceptedAnswers.map((item, index) => (
										<li key={`${item.blankKey}-${index}`}>
											{item.acceptedAnswer}
										</li>
									))}
								</ul>
							) : (
								<ul className="mt-2 space-y-2">
									{question.options.map((option) => {
										const solution = question.solution?.options.find(
											(item) => item.optionId === option.id
										)
										if (solution?.isCorrect !== true) return null
										return (
											<li
												key={option.id}
												className="font-medium text-emerald-800"
											>
												{option.label && `${option.label}. `}
												{option.text}
												{solution?.explanation && (
													<p className="mt-0.5 text-xs font-normal text-slate-600">
														{solution.explanation}
													</p>
												)}
											</li>
										)
									})}
								</ul>
							)}
							{question.solution.explanation && (
								<div className="mt-3 border-t border-emerald-200 pt-3">
									<p className="font-medium text-slate-800">Explanation</p>
									<p className="mt-1 whitespace-pre-line leading-6 text-slate-700">
										{question.solution.explanation}
									</p>
								</div>
							)}
						</div>
					)}
				</Fragment>
			)}
		</div>
	)
}

interface GradingBadgeProps {
	status: NonNullable<ReturnType<typeof getGradingStatus>>
}

function GradingBadge({ status }: GradingBadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
				status === "correct"
					? "bg-emerald-50 text-emerald-700"
					: status === "partially-correct"
						? "bg-amber-50 text-amber-800"
						: "bg-red-50 text-red-700"
			)}
		>
			{status === "correct" && <CheckCircle2 className="size-3.5" />}
			{status.replace("-", " ")}
		</span>
	)
}
