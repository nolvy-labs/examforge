import { BarChart3, Clock3, FileCheck2 } from "lucide-react"

const progressItems = [
	{ label: "Exams completed", value: "0", icon: FileCheck2 },
	{ label: "Average score", value: "—", icon: BarChart3 },
	{ label: "Practice time", value: "0m", icon: Clock3 },
]

export function DashboardProgress() {
	return (
		<section>
			<h2 id="progress-heading" className="text-xl font-semibold tracking-tight text-slate-950">
				Progress overview
			</h2>
			<div className="mt-4 grid gap-4 sm:grid-cols-3">
				{progressItems.map(({ label, value, icon: Icon }) => (
					<article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
						<div className="flex items-center justify-between gap-4">
							<p className="text-sm font-medium text-slate-600">{label}</p>
							<span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
								<Icon className="size-4" />
							</span>
						</div>
						<p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
					</article>
				))}
			</div>
		</section>
	)
}