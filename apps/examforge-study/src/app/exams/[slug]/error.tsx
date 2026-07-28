"use client"

import { ExamDetailError } from "@/features/exams/exam-detail/components/exam-detail-error"

export default function ErrorPage({ reset }: { reset: () => void }) {
	return <ExamDetailError onRetry={reset} />
}