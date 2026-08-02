import {
	BookOpen,
	Clock3,
	FileQuestion,
	Trophy,
	type LucideIcon,
} from "lucide-react"

import type { StudentExam } from "../types/exam.types"

const metadataItems: Array<{ icon: LucideIcon, getLabel: (exam: StudentExam) => string }> = [
	{
		icon: Clock3,
		getLabel: (exam) => exam.publishedVersion.durationMinutes == null ? "No time limit" : `${exam.publishedVersion.durationMinutes} min`,
	},
	{
		icon: FileQuestion,
		getLabel: (exam) => `${exam.publishedVersion.questionCount} questions`,
	},
	{
		icon: Trophy,
		getLabel: (exam) => `${exam.publishedVersion.totalScore} points`,
	},
	{
		icon: BookOpen,
		getLabel: (exam) => `${exam.publishedVersion.sectionCount} sections`,
	},
]

export function ExamMetadata({ exam }: { exam: StudentExam }) {
	return (
		<div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-auto">
			{metadataItems.map(({ icon: Icon, getLabel }) => {
				const label = getLabel(exam)
				return (
					<div key={label} className="flex min-w-0 items-center gap-1.5">
						<Icon className="size-3.5 shrink-0" />
						<span className="truncate">{label}</span>
					</div>
				)
			})}
		</div>
	)
}