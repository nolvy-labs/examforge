import { DashboardAttemptList } from "./dashboard.attempt-list"

export function DashboardContinue() {
	return (
		<section className="flex flex-col gap-4">
			<h2 id="continue-heading" className="text-xl font-semibold tracking-tight text-neutral-950">
				Continue practising
			</h2>
			<DashboardAttemptList
				status="in-progress"
				emptyTitle="No unfinished attempts"
				emptyDescription="Start an exam and it will be ready to continue here."
			/>
		</section>
	)
}
