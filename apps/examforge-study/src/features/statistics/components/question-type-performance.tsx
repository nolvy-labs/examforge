import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card"

import type { QuestionTypePerformance } from "../types/statistics.type"
import { formatPercentage, formatPoints, formatQuestionType } from "../utils/statistics.format";

export function QuestionTypePerformanceSection({ rows }: { rows: QuestionTypePerformance[] }) {
	return (
		<section aria-labelledby="question-performance-heading">
			<div className="mb-4">
				<h2 id="question-performance-heading" className="text-xl font-semibold tracking-tight">
					Performance by question type
				</h2>
			</div>
			{rows.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-slate-600">No question performance data matches these filters yet.</CardContent></Card> : (
				<div className="grid gap-4 lg:grid-cols-2">{rows.map((row) => (
					<Card key={row.questionType}>
						<CardHeader>
							<CardTitle className="truncate" title={formatQuestionType(row.questionType)}>
								{formatQuestionType(row.questionType)}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-baseline justify-between gap-3">
								<p className="text-sm text-slate-600">{formatPoints(row.pointsEarned)} / {formatPoints(row.maximumPoints)} points</p>
								<p className="font-semibold">{formatPercentage(row.pointsPercentage)}</p>
							</div>
							<dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
								<Count label="Correct" value={row.correctCount} />
								<Count label="Partially correct" value={row.partiallyCorrectCount} />
								<Count label="Incorrect" value={row.incorrectCount} />
								<Count label="Unanswered" value={row.unansweredCount} />
							</dl>
						</CardContent>
					</Card>
				))}</div>
			)}
		</section>
	)
}

function Count({ label, value }: { label: string; value: number }) { return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div> }
