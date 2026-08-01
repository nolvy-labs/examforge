import type { Metadata } from "next"

import { ExamBuilderPage } from "@/features/exams/exam-builder/pages/exam-builder.page"

export const metadata: Metadata = { title: "Exam Builder", description: "Create, validate, and publish an Exam Version." }

export default async function Page({ params }: { params: Promise<{ examId: string; versionId: string }> }) {
	const { examId, versionId } = await params
	return <ExamBuilderPage examId={examId} versionId={versionId} />
}
