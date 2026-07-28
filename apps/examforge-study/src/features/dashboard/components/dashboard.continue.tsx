import { BookOpen } from "lucide-react"

export function DashboardContinue() {
	return (
		<section>
			<h2 id="continue-heading" className="text-xl font-semibold tracking-tight text-slate-950">
				Continue practising
			</h2>
			<div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center sm:px-8">
				<div className="mx-auto grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-600">
					<BookOpen className="size-5" />
				</div>
				<h3 className="mt-4 font-semibold text-slate-900">No active practice sessions</h3>
				<p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
					Active practice sessions will appear here when exam practice becomes available.
				</p>
			</div>
		</section>
	)
}