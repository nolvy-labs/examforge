import { DashboardAttemptList } from "./dashboard.attempt-list"

export function DashboardActivity() {
	return (
		<section className="flex flex-col gap-4">
			<h2 id="activity-heading" className="text-xl font-semibold tracking-tight text-neutral-950">
				Recent submissions
			</h2>
			<DashboardAttemptList
				status="submitted"
				emptyTitle="No submissions yet"
				emptyDescription="Submitted exams will appear here for quick review."
			/>
		</section>
	)
}
