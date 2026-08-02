import { Card } from "@/components/shadcn/card"
import { StudentExam } from "@/features/exams/types/exam.types"
import { BookOpen } from "lucide-react"

export function DashboardContinue() {
	return (
		<section className="flex flex-col gap-4">
			<h2 id="continue-heading" className="text-xl font-semibold tracking-tight text-slate-950">
				Continue practising
			</h2>
			<EmptyCard />
		</section>
	)
}

function EmptyCard() {
	return (
		<Card className="flex items-center justify-center gap-2 border-dashed">
			<div className="grid size-11 place-items-center rounded-lg bg-slate-100 text-slate-600">
				<BookOpen className="size-5" />
			</div>
			<h3 className="mt-4 font-semibold text-slate-900">No active practice sessions</h3>
		</Card>
	)
}

interface ContinueListProps {
	exams: StudentExam[]
}

function ContinueList({ exams }: ContinueListProps) {
	return (
		<Card className="flex items-center justify-center gap-2 border-dashed">
			{/* TODO: Implement this */}
		</Card>
	)
}