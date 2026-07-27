import { StudentHeader } from "@/components/layout/student.header"
import { StudentGuard } from "@/features/auth/components/student.guard"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<StudentGuard>
			<div className="flex min-h-svh flex-col bg-slate-50">
				<StudentHeader />
				{children}
			</div>
		</StudentGuard>
	)
}