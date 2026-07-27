import { StudentGuard } from "@/features/auth/components/student.guard"

export default function AttemptsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return <StudentGuard>{children}</StudentGuard>
}
