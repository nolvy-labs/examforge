import { Card, CardContent } from "@/components/shadcn/card"

import type { StudentExamDetail } from "../../types/exam.types"
import { getOrderedSections } from "../model/exam-detail"
import { ExamAttemptHistory } from "./exam-attempt-history"
import { ExamSectionList } from "./exam-section-list"

interface Props {
	detail: StudentExamDetail
}

export function ExamDetailContent({ detail }: Props) {
	return (
		<div className="order-2 min-w-0 space-y-10 lg:order-1">
			{detail.publishedVersion.instructions.trim() && (
				<Card>
					<CardContent>
						<section>
							<h2
								id="exam-instructions-heading"
								className="text-xl font-semibold"
							>
								Instructions
							</h2>
							<p className="mt-3 whitespace-pre-line wrap-break-word text-sm leading-7">
								{detail.publishedVersion.instructions}
							</p>
						</section>
					</CardContent>
				</Card>
			)}
			<ExamSectionList sections={getOrderedSections(detail)} />
			<ExamAttemptHistory examId={detail.exam.id} />
		</div>
	)
}
