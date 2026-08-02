import { Card, CardContent } from "@/components/shadcn/card"

import type { StudentExamDetail } from "../../types/exam.types"
import { getOrderedSections } from "../model/exam-detail"
import { ExamAttemptHistory } from "./exam-attempt-history"
import { ExamSectionList } from "./exam-section-list"
import ContentRenderer from "@/components/common/content-renderer"

interface Props {
	detail: StudentExamDetail
}

export function ExamDetailContent({ detail }: Props) {
	return (
		<div className="order-2 min-w-0 flex flex-col gap-10 lg:order-1">
			{detail.publishedVersion.instructions.trim() && (
				<section className="flex flex-col gap-4">
					<h2
						id="exam-instructions-heading"
						className="text-xl font-semibold"
					>
						Main Instructions
					</h2>
					<Card className="p-0">
						<CardContent className="p-4">
							<div className="whitespace-pre-line wrap-break-word text-sm leading-7">
								<ContentRenderer content={detail.publishedVersion.instructions} />
							</div>
						</CardContent>
					</Card>
				</section>
			)}
			<ExamSectionList sections={getOrderedSections(detail)} />
			<ExamAttemptHistory examId={detail.exam.id} />
		</div>
	)
}
