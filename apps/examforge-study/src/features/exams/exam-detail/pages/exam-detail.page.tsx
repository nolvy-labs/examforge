import { MainHeader } from "@/components/layout/header/header"

import type { StudentExamDetail } from "../../types/exam.types"
import { ExamDetailContent } from "../components/exam-detail-content"
import { ExamDetailHeader } from "../components/exam-detail-header"
import { ExamDetailSidebar } from "../components/exam-detail-sidebar"

export function ExamDetailPage({ detail }: { detail: StudentExamDetail }) {
	return (
		<div className="flex min-h-svh flex-col bg-muted/30">
			<MainHeader />
			<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
				<ExamDetailHeader detail={detail} />
				<div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
					<ExamDetailContent detail={detail} />
					<ExamDetailSidebar detail={detail} />
				</div>
			</main>
		</div>
	)
}
