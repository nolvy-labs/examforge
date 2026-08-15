import { Card, CardContent } from "@/components/shadcn/card"

import type { StudentExamDetail } from "../../types/exam.types"
import { getOrderedSections } from "../model/exam-detail"
import { ExamAttemptHistory } from "./exam-attempt-history"
import { ExamSectionList } from "./exam-section-list"
import {
	RichTextRenderer,
	renderRichTextHtml,
} from "@/components/common/rich-text-renderer"
import { LocaleMessage } from "@/components/locale/locale-message"

interface Props {
	detail: StudentExamDetail
}

export function ExamDetailContent({ detail }: Props) {
	return (
		<div className="order-2 min-w-0 flex flex-col gap-10 lg:order-1">
			<RichTextSection
				title="exams.versionDescription"
				content={detail.publishedVersion.description}
			/>
			<RichTextSection
				title="exams.instructions"
				content={detail.publishedVersion.instructions}
			/>
			<ExamSectionList sections={getOrderedSections(detail)} />
			<ExamAttemptHistory examId={detail.exam.id} />
		</div>
	)
}

function RichTextSection({
	title,
	content,
}: {
	title: "exams.versionDescription" | "exams.instructions"
	content: string
}) {
	if (!renderRichTextHtml(content)) return null

	return (
		<section className="flex flex-col gap-4">
					<h2 className="text-xl font-semibold">
						<LocaleMessage messageId={title} />
					</h2>
					<Card className="p-0">
						<CardContent className="p-4">
							<RichTextRenderer content={content} className="text-sm" />
						</CardContent>
					</Card>
		</section>
	)
}
