import { History } from "lucide-react"

export function DashboardActivity() {
	return (
		<section>
			<h2 id="activity-heading" className="text-xl font-semibold tracking-tight text-slate-950">
				Recent activity
			</h2>
			<div className="mt-4 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
					<History className="size-5" />
				</span>
				<p className="text-sm text-slate-600">Your completed practice exams will appear here.</p>
			</div>
		</section>
	)
}