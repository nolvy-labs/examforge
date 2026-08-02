import { Clock3, FileQuestion, Layers3, Trophy, type LucideIcon } from "lucide-react"

import type { StudentExamDetail } from "../../types/exam.types"
import { formatNumber, getExamCounts } from "../model/exam-detail"

interface Props {
	detail: StudentExamDetail
}

export function ExamOverview({ detail }: Props) {
	const counts = getExamCounts(detail)
	const version = detail.publishedVersion
	const facts: Array<{ icon: LucideIcon; label: string; value: string }> = [
		{
			icon: Clock3,
			label: "Duration",
			value:
				version.durationMinutes == null
					? "No time limit"
					: `${version.durationMinutes} min`,
		},
		{
			icon: FileQuestion,
			label: "Questions",
			value: String(counts.questionCount),
		},
		{ icon: Layers3, label: "Sections", value: String(counts.sectionCount) },
		{
			icon: Trophy,
			label: "Total points",
			value: formatNumber(version.totalScore),
		}
	]

	return (
		<div>
			<h2 className="text-lg font-semibold">Exam details</h2>
			<dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
				{facts.map(({ icon: Icon, label, value }) => (
					<div key={label} className="min-w-0 rounded-md bg-muted p-3">
						<dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<Icon className="size-3.5" />
							{label}
						</dt>
						<dd className="mt-1 truncate font-medium">{value}</dd>
					</div>
				))}
			</dl>
		</div>
	)
}
