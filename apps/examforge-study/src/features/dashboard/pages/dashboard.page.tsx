import { DashboardActivity } from "@/features/dashboard/components/dashboard.activity"
import { DashboardContinue } from "@/features/dashboard/components/dashboard.continue"
import { DashboardExams } from "@/features/dashboard/components/dashboard.exams"
import { DashboardProgress } from "@/features/dashboard/components/dashboard.progress"
import { DashboardWelcome } from "@/features/dashboard/components/dashboard.welcome"

export function DashboardPage() {
	return (
		<main className="mx-auto w-full max-w-7xl flex-1 space-y-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
			<DashboardWelcome />
			<DashboardContinue />
			<DashboardProgress />
			<DashboardExams />
			<DashboardActivity />
		</main>
	)
}