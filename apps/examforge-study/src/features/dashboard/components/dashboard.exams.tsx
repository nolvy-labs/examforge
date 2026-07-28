import { ChevronsRight } from "lucide-react"

import { PLACEHOLDER_EXAMS } from "@/features/dashboard/data/dashboard.placeholder"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/shadcn/button"
import ExamCard from "@/features/exams/components/exam-card"

export function DashboardExams() {
	return (
		<section>
			<div>
				<h2 id="exams-heading" className="text-xl font-semibold tracking-tight text-slate-950">
					Recommended exams
				</h2>
				<div className="flex justify-between">
					<p className="mt-1 text-sm text-slate-600">A preview of practice content planned for ExamForge.</p>
					<Link
						href={"/exams"}
						className={cn(
							buttonVariants({ variant: "link" }),
							"text-sm h-fit"
						)}
					>
						{"View all exams"}
						<ChevronsRight />
					</Link>
				</div>
			</div>
			<div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{PLACEHOLDER_EXAMS.map((exam) => (
					<ExamCard key={exam.id} exam={exam} />
				))}
			</div>
		</section>
	)
}