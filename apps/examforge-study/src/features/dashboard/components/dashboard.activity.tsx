import { DashboardAttemptList } from "./dashboard.attempt-list"
import { LocaleMessage } from "@/components/locale/locale-message"

export function DashboardActivity() {
	return (
		<section className="flex flex-col gap-4">
			<h2 id="activity-heading" className="text-xl font-semibold tracking-tight text-neutral-950">
				<LocaleMessage messageId="dashboard.recentSubmissions" />
			</h2>
			<DashboardAttemptList
				status="submitted"
				emptyTitle="dashboard.noSubmissionsTitle"
				emptyDescription="dashboard.noSubmissionsDescription"
			/>
		</section>
	)
}
