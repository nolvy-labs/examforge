import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/table"

import type { ExamPerformance } from "../types/statistics.type"
import { formatPercentage } from "../utils/statistics.format"

export function ExamPerformanceSection({ exams }: { exams: ExamPerformance[] }) {
	return (
		<Card>
			<CardHeader><CardTitle>Performance by exam</CardTitle><p className="text-sm text-slate-600">Top 10 by completed attempts.</p></CardHeader>
			<CardContent>
				{exams.length === 0 ? <Empty /> : (
					<>
						<div className="hidden overflow-x-auto md:block">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Exam</TableHead>
										<TableHead>Attempts</TableHead>
										<TableHead>Latest</TableHead>
										<TableHead>Average</TableHead>
										<TableHead>Best</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{exams.map((exam) => (
										<TableRow key={exam.examId}>
											<TableCell className="max-w-80">
												<Link
													title={exam.examTitle}
													href={`/exams/${encodeURIComponent(exam.examSlug)}`}
													className="block truncate font-medium text-indigo-700 hover:underline"
												>
													{exam.examTitle}
												</Link>
											</TableCell>
											<TableCell>{exam.attemptCount}</TableCell>
											<TableCell>{formatPercentage(exam.latestScorePercentage)}</TableCell>
											<TableCell>{formatPercentage(exam.averageScorePercentage)}</TableCell>
											<TableCell>{formatPercentage(exam.bestScorePercentage)}</TableCell>
										</TableRow>))}
								</TableBody>
							</Table>
						</div>
						<div className="space-y-3 md:hidden">
							{exams.map((exam) => (
								<div key={exam.examId} className="rounded-lg border p-4">
									<Link
										href={`/exams/${encodeURIComponent(exam.examSlug)}`}
										className="block truncate font-medium text-indigo-700"
										title={exam.examTitle}>
										{exam.examTitle}
									</Link>
									<p className="mt-1 text-sm text-slate-600">{exam.attemptCount} {exam.attemptCount === 1 ? "attempt" : "attempts"}</p>
									<dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
										<Score label="Latest" value={exam.latestScorePercentage} />
										<Score label="Average" value={exam.averageScorePercentage} />
										<Score label="Best" value={exam.bestScorePercentage} />
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
	return (
		<div>
			<dt className="text-xs text-slate-500">{label}</dt>
			<dd className="mt-1 font-medium">{formatPercentage(value)}</dd>
		</div>
	)
}
function Empty() { return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-600">No completed attempts match these filters yet.</div> }
