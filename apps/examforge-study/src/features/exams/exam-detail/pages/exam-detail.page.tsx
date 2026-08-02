import { MainHeader } from "@/components/layout/header/header"

import type { StudentExamDetail } from "../../types/exam.types"
import { ExamDetailContent } from "../components/exam-detail-content"
import { ExamDetailHeader } from "../components/exam-detail-header"
import { Card, CardContent } from "@/components/shadcn/card"
import { ExamOverview } from "../components/exam-overview"
import { Separator } from "@/components/shadcn/separator"
import { ExamAttemptActions } from "../components/exam-attempt-actions"

export function ExamDetailPage({ detail }: { detail: StudentExamDetail }) {
	return (
		<div className="flex min-h-svh flex-col bg-muted/30">
			<MainHeader />
			<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
				<ExamDetailHeader detail={detail} />
				<div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
					<ExamDetailContent detail={detail} />
					<ExamDetailSidebar detail={detail} />
				</div>
			</main>
		</div>
	)
}

interface Props {
	detail: StudentExamDetail
}

export function ExamDetailSidebar({ detail }: Props) {
	return (
		<aside className="order-1 lg:order-2 lg:sticky lg:top-6">
			<Card>
				<CardContent className="flex flex-col gap-4">
					<ExamOverview detail={detail} />
					<Separator />
					<ExamAttemptActions detail={detail} />
				</CardContent>
			</Card>
		</aside>
	)
}