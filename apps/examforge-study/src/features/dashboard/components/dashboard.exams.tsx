import { Clock3, LockKeyhole } from "lucide-react"

import { PLACEHOLDER_EXAMS } from "@/features/dashboard/data/dashboard.placeholder"

export function DashboardExams() {
	return (
		<section aria-labelledby="exams-heading">
			<div>
				<h2 id="exams-heading" className="text-xl font-semibold tracking-tight text-slate-950">
					Recommended exams
				</h2>
				<p className="mt-1 text-sm text-slate-600">A preview of practice content planned for ExamForge.</p>
			</div>
			<div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{PLACEHOLDER_EXAMS.map((exam) => (
					<article
						key={exam.title}
						aria-label={`${exam.title}. Coming soon and not currently available.`}
						className="flex min-h-64 cursor-not-allowed flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
					>
						<div className="flex items-start justify-between gap-3">
							<p className="text-sm font-semibold text-indigo-600">{exam.subject}</p>
							<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
								<LockKeyhole className="size-3" aria-hidden="true" />
								Coming soon
							</span>
						</div>
						<h3 className="mt-5 text-lg font-semibold text-slate-950">{exam.title}</h3>
						<p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{exam.description}</p>
						<p className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
							<Clock3 className="size-3.5" aria-hidden="true" />
							{exam.details}
						</p>
					</article>
				))}
			</div>
		</section>
	)
}