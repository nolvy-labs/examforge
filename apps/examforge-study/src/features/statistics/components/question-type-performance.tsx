import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card"

import type { QuestionTypePerformance } from "../types/statistics.type"
import { formatPercentage, formatPoints } from "../utils/statistics.format";
import { LocaleMessage } from "@/components/locale/locale-message"
import { useLocale, useTranslations } from "next-intl"

export function QuestionTypePerformanceSection({ rows }: { rows: QuestionTypePerformance[] }) {
	const locale = useLocale()
	const translate = useTranslations("statistics")
	const attempt = useTranslations("attempt")
	const typeLabel = (value: number) => translate(value === 0 ? "fillBlank" : value === 1 ? "singleChoice" : value === 2 ? "multipleChoice" : value === 3 ? "group" : "unknownQuestionType")
	return (
		<section aria-labelledby="question-performance-heading">
			<div className="mb-4">
				<h2 id="question-performance-heading" className="text-xl font-semibold tracking-tight">
					<LocaleMessage messageId="statistics.questionPerformance" />
				</h2>
			</div>
			{rows.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-neutral-600"><LocaleMessage messageId="statistics.noQuestionPerformance" /></CardContent></Card> : (
				<div className="grid gap-4 lg:grid-cols-2">{rows.map((row) => (
					<Card key={row.questionType}>
						<CardHeader>
							<CardTitle className="truncate" title={typeLabel(row.questionType)}>
								{typeLabel(row.questionType)}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-baseline justify-between gap-3">
								<p className="text-sm text-neutral-600">{translate("pointsScore", { earned: formatPoints(row.pointsEarned, locale), maximum: formatPoints(row.maximumPoints, locale) })}</p>
								<p className="font-semibold">{formatPercentage(row.pointsPercentage, locale)}</p>
							</div>
							<dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
								<Count label={attempt("correct")} value={row.correctCount} />
								<Count label={attempt("partiallyCorrect")} value={row.partiallyCorrectCount} />
								<Count label={attempt("incorrect")} value={row.incorrectCount} />
								<Count label={attempt("unanswered")} value={row.unansweredCount} />
							</dl>
						</CardContent>
					</Card>
				))}</div>
			)}
		</section>
	)
}

function Count({ label, value }: { label: string; value: number }) { const locale = useLocale(); return <div><dt className="text-xs text-neutral-500">{label}</dt><dd className="mt-1 font-semibold">{new Intl.NumberFormat(locale).format(value)}</dd></div> }
