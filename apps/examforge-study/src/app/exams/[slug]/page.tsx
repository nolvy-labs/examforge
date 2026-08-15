import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import {
	getPublicExamDetail,
	PublicExamNotFoundError,
} from "@/features/exams/api/exam-detail.server"
import { ExamDetailPage } from "@/features/exams/exam-detail/pages/exam-detail.page"
import { richTextToPlainText } from "@/components/common/rich-text-renderer"

interface ExamPageProps {
	params: Promise<{ slug: string }>
}

export async function generateMetadata({
	params,
}: ExamPageProps): Promise<Metadata> {
	const { slug } = await params
	const translate = await getTranslations("metadata")
	try {
		const detail = await getPublicExamDetail(slug)
		return {
			title: detail.exam.title,
			description:
				detail.exam.description.trim() ||
				richTextToPlainText(detail.publishedVersion.description) ||
				translate("examsDescription"),
		}
	} catch {
		return {
			title: translate("examUnavailable"),
			description: translate("examUnavailableDescription"),
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
