import type { Metadata } from "next"
import { Suspense } from "react"

import {
	ExamManagementPage,
	ExamManagementPageFallback,
} from "@/features/exams/exam-management/pages/exam-management.page"

export const metadata: Metadata = {
	title: "Exam Management",
	description: "Create, filter, archive, and restore ExamForge exams.",
}

export default function ExamsPage() {
	return (
		<Suspense fallback={<ExamManagementPageFallback />}>
			<ExamManagementPage />
		</Suspense>
	)
}
