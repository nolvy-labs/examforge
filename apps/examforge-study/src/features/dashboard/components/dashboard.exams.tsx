import { ChevronsRight } from "lucide-react"

import { PLACEHOLDER_EXAMS } from "@/features/dashboard/data/dashboard.placeholder"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/shadcn/button"
import ExamCard from "@/features/exams/components/exam-card"

export function DashboardExams() {
	return (
		<section className="flex flex-col gap-4">
			<div>
				<div className="flex justify-between">
					<h2 id="exams-heading" className="text-xl font-semibold tracking-tight text-slate-950">
						Recommended exams
					</h2>
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
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{PLACEHOLDER_EXAMS.map((exam) => (
					<ExamCard key={exam.id} exam={exam} />
				))}
			</div>
		</section>
	)
}