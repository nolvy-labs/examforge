import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/table"

import type { ExamPerformance } from "../types/statistics.type"
import { formatPercentage } from "../utils/statistics.format"
import { LocaleMessage } from "@/components/locale/locale-message"
import { useLocale, useTranslations } from "next-intl"

export function ExamPerformanceSection({ exams }: { exams: ExamPerformance[] }) {
	const locale = useLocale()
	const translate = useTranslations("statistics")
	return (
		<Card>
			<CardHeader><CardTitle><LocaleMessage messageId="statistics.performanceByExam" /></CardTitle><p className="text-sm text-neutral-600"><LocaleMessage messageId="statistics.performanceByExamDescription" /></p></CardHeader>
			<CardContent>
				{exams.length === 0 ? <Empty /> : (
					<>
						<div className="hidden overflow-x-auto md:block">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead><LocaleMessage messageId="statistics.exam" /></TableHead>
										<TableHead><LocaleMessage messageId="statistics.attempts" /></TableHead>
										<TableHead><LocaleMessage messageId="statistics.latest" /></TableHead>
										<TableHead><LocaleMessage messageId="statistics.average" /></TableHead>
										<TableHead><LocaleMessage messageId="statistics.best" /></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{exams.map((exam) => (
										<TableRow key={exam.examId}>
											<TableCell className="max-w-80">
												<Link
													title={exam.examTitle}
													href={`/exams/${encodeURIComponent(exam.examSlug)}`}
													className="block truncate font-medium text-primary hover:underline"
												>
													{exam.examTitle}
												</Link>
											</TableCell>
											<TableCell>{new Intl.NumberFormat(locale).format(exam.attemptCount)}</TableCell>
											<TableCell>{formatPercentage(exam.latestScorePercentage, locale)}</TableCell>
											<TableCell>{formatPercentage(exam.averageScorePercentage, locale)}</TableCell>
											<TableCell>{formatPercentage(exam.bestScorePercentage, locale)}</TableCell>
										</TableRow>))}
								</TableBody>
							</Table>
						</div>
						<div className="space-y-3 md:hidden">
							{exams.map((exam) => (
								<div key={exam.examId} className="rounded-lg border p-4">
									<Link
										href={`/exams/${encodeURIComponent(exam.examSlug)}`}
										className="block truncate font-medium text-primary"
										title={exam.examTitle}>
										{exam.examTitle}
									</Link>
									<p className="mt-1 text-sm text-neutral-600">{translate("attemptCount", { count: exam.attemptCount })}</p>
									<dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
										<Score label={translate("latest")} value={exam.latestScorePercentage} />
										<Score label={translate("average")} value={exam.averageScorePercentage} />
										<Score label={translate("best")} value={exam.bestScorePercentage} />
									</dl>
								</div>
							))}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	)
}

function Score({ label, value }: { label: string; value: number | null }) {
	const locale = useLocale()
	return (
		<div>
			<dt className="text-xs text-neutral-500">{label}</dt>
			<dd className="mt-1 font-medium">{formatPercentage(value, locale)}</dd>
		</div>
	)
}
function Empty() { return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-neutral-600"><LocaleMessage messageId="statistics.noExamPerformance" /></div> }
