import { StudentGuard } from "@/features/auth/components/student.guard"

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
	return <StudentGuard>{children}</StudentGuard>
}
