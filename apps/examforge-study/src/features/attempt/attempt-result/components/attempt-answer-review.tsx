import { CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"

import type { AttemptQuestion } from "../../types/attempt.type"
import { LocaleMessage } from "@/components/locale/locale-message"
import { getGradingStatus, getQuestionType } from "../../types/attempt.type"
import { formatAttemptNumber, getAnswerText } from "../model/attempt-result"
import { Fragment } from "react"
import { useLocale, useTranslations } from "next-intl"

interface AttemptAnswerReviewProps {
	question: AttemptQuestion
	showGrading: boolean
}

export function AttemptAnswerReview({
	question,
	showGrading,
}: AttemptAnswerReviewProps) {
	const locale = useLocale()
	const translate = useTranslations("attempt")
	const exams = useTranslations("exams")
	const type = getQuestionType(question.type)
	const answer = question.answer
	const status = getGradingStatus(answer?.gradingStatus)

	return (
		<div className="space-y-4 text-sm">
			{(type === "multiple-choice-single" || type === "multiple-choice-multiple") && (
				<div className="rounded-xl bg-neutral-50 p-4">
					<p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
						<LocaleMessage messageId="attempt.options" />
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
										<p className="mt-0.5 text-xs font-normal text-neutral-600">
											{solution.explanation}
										</p>
									)}
								</li>
							)
						})}
					</ul>
				</div>
			)}

			<div className="rounded-xl bg-neutral-50 p-4">
				<p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
					<LocaleMessage messageId="attempt.yourAnswer" />
				</p>
				<p className="mt-2 whitespace-pre-line text-neutral-900">
					{getAnswerText(question, translate("unanswered"))}
				</p>
			</div>
			{showGrading && (
				<Fragment>
					<div className="flex flex-wrap items-center gap-2">
						{status && <GradingBadge status={status} />}
						{answer?.awardedScore != null && answer.maximumScore != null && (
							<span className="text-xs font-medium text-neutral-600">
								{exams("points", { count: `${formatAttemptNumber(answer.awardedScore, locale)} / ${formatAttemptNumber(answer.maximumScore, locale)}` })}
							</span>
						)}
					</div>
					{question.solution && (
						<div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
								<LocaleMessage messageId="attempt.correctSolution" />
							</p>
							{type === "fill-blank" ? (
								<ul className="mt-2 list-inside list-disc text-neutral-800">
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
													<p className="mt-0.5 text-xs font-normal text-neutral-600">
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
									<p className="font-medium text-neutral-800"><LocaleMessage messageId="attempt.explanation" /></p>
									<p className="mt-1 whitespace-pre-line leading-6 text-neutral-700">
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
	const translate = useTranslations("attempt")
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
			{translate(status === "partially-correct" ? "partiallyCorrect" : status)}
		</span>
	)
}
