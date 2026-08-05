import { DashboardAttemptList } from "./dashboard.attempt-list"
import { LocaleMessage } from "@/components/locale/locale-message"

export function DashboardContinue() {
	return (
		<section className="flex flex-col gap-4">
			<h2 id="continue-heading" className="text-xl font-semibold tracking-tight text-neutral-950">
				<LocaleMessage messageId="dashboard.continuePractising" />
			</h2>
			<DashboardAttemptList
				status="in-progress"
				emptyTitle="dashboard.noUnfinishedTitle"
				emptyDescription="dashboard.noUnfinishedDescription"
			/>
		</section>
	)
}
