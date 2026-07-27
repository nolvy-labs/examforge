import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { MainHeader } from "@/components/layout/header/header"

import {
	ExamAttemptActionClient,
	ExamAttemptHistoryClient,
} from "../components/exam-detail-attempts.client"
import {
	ExamBody,
	ExamFacts,
	ExamOverview,
} from "../components/exam-detail.content"
import type { StudentExamDetail } from "../model/exam-detail.types"

export function ExamDetailPage({ detail }: { detail: StudentExamDetail }) {
	return (
		<div className="flex min-h-svh flex-col bg-slate-50">
			<MainHeader />
			<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
				<Link
					href="/exams"
					className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
				>
					<ArrowLeft className="size-4" aria-hidden="true" />
					Back to Browse Exams
				</Link>

				<div className="mt-6">
					<ExamOverview detail={detail} />
				</div>

				<div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
					<div className="order-2 min-w-0 space-y-10 lg:order-1">
						<ExamBody detail={detail} />
						<ExamAttemptHistoryClient examId={detail.exam.id} />
					</div>

					<aside
						aria-label="Exam facts and attempt actions"
						className="order-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:order-2 lg:sticky lg:top-6"
					>
						<ExamFacts detail={detail} />
						<div className="my-5 border-t border-slate-200" />
						<ExamAttemptActionClient detail={detail} />
					</aside>
				</div>
			</main>
		</div>
	)
}
