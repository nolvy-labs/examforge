import { Card, CardContent } from "@/components/shadcn/card"
import { Separator } from "@/components/shadcn/separator"

import type { StudentExamDetail } from "../../types/exam.types"
import { ExamAttemptActions } from "./exam-attempt-actions"
import { ExamOverview } from "./exam-overview"

interface Props {
	detail: StudentExamDetail
}

export function ExamDetailSidebar({ detail }: Props) {
	return (
		<aside className="order-1 lg:order-2 lg:sticky lg:top-6">
			<Card>
				<CardContent>
					<ExamOverview detail={detail} />
					<Separator className="my-5" />
					<ExamAttemptActions detail={detail} />
				</CardContent>
			</Card>
		</aside>
	)
}
