import type { Metadata } from "next"
import { notFound } from "next/navigation"

import {
	getPublicExamDetail,
	PublicExamNotFoundError,
} from "@/features/exams/api/exam-detail.server"
import { ExamDetailPage } from "@/features/exams/exam-detail/pages/exam-detail.page"

interface ExamPageProps {
	params: Promise<{ slug: string }>
}

export async function generateMetadata({
	params,
}: ExamPageProps): Promise<Metadata> {
	const { slug } = await params
	try {
		const detail = await getPublicExamDetail(slug)
		return {
			title: detail.exam.title,
			description:
				detail.exam.description.trim() ||
				detail.publishedVersion.description.trim() ||
				"Review this published ExamForge exam.",
		}
	} catch {
		return {
			title: "Exam unavailable",
			description: "This ExamForge exam is currently unavailable.",
		}
	}
}

export default async function ExamPage({ params }: ExamPageProps) {
	const { slug } = await params
	let detail
	try {
		detail = await getPublicExamDetail(slug)
	} catch (error) {
		if (error instanceof PublicExamNotFoundError) notFound()
		throw error
	}
	return <ExamDetailPage detail={detail} />
}
