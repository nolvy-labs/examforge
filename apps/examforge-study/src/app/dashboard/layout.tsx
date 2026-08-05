import { MainHeader } from "@/components/layout/header/header"
import { StudentGuard } from "@/features/auth/components/student.guard"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<StudentGuard>
			<div className="flex min-h-svh flex-col bg-neutral-50">
				<MainHeader />
				{children}
			</div>
		</StudentGuard>
	)
}
