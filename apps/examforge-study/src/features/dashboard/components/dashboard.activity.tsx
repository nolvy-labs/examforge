import { Card } from "@/components/shadcn/card"
import { History } from "lucide-react"

export function DashboardActivity() {
	return (
		<section className="flex flex-col gap-4">
			<h2 id="activity-heading" className="text-xl font-semibold tracking-tight text-slate-950">
				Recent activity
			</h2>
			<Card className="flex flex-row items-center p-4">
				<span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
					<History className="size-5" />
				</span>
				<p className="text-sm text-slate-600">Your completed practice exams will appear here.</p>
			</Card>
		</section>
	)
}