import type { Metadata } from "next"
import { Suspense } from "react"

import {
	ClassificationManagementPage,
	ClassificationManagementPageFallback,
} from "@/features/exam-classifications/pages/classification-management.page"

export const metadata: Metadata = {
	title: "Classification Management",
	description: "Create and manage ExamForge exam tags and categories.",
}

export default function ClassificationsPage() {
	return (
		<Suspense fallback={<ClassificationManagementPageFallback />}>
			<ClassificationManagementPage />
		</Suspense>
	)
}
