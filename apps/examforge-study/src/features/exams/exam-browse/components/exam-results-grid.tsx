import ExamCard from "../../components/exam-card"
import type { StudentExam } from "../../types/exam.types"
import { cn } from "@/lib/utils"

interface Props {
	exams: StudentExam[]
	isPlaceholderData: boolean
}

export function ExamResultsGrid({ exams, isPlaceholderData }: Props) {
	return (
		<div
			className={cn(
				"grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3",
				isPlaceholderData && "opacity-60"
			)}
		>
			{exams.map((exam) => (
				<ExamCard key={exam.id} exam={exam} />
			))}
		</div>
	)
}
