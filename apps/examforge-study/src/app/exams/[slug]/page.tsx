import type { Metadata } from "next"

import { ExamDetailPage } from "@/features/exams/pages/exam-detail.page"

export const metadata: Metadata = {
	title: "Exam Details",
	description: "Review an ExamForge exam and manage your attempts.",
}

export default async function ExamPage({
	params,
}: {
	params: Promise<{ slug: string }>
}) {
	const { slug } = await params
	return <ExamDetailPage slug={slug} />
}
