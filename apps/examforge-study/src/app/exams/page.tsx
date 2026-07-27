import type { Metadata } from "next"
import { Suspense } from "react"

import { MainHeader } from "@/components/layout/header/header"
import { ExamBrowsePage } from "@/features/exams/pages/exam-browse.page"

export const metadata: Metadata = {
	title: "Browse Exams",
	description: "Discover published ExamForge exams by title, category, and topic.",
}

export default function ExamsPage() {
	return (
		<div className="flex min-h-svh flex-col">
			<MainHeader />
			<Suspense fallback={<ExamBrowseFallback />}>
				<ExamBrowsePage />
			</Suspense>
		</div>
	)
}

function ExamBrowseFallback() {
	return (
		<main className="flex-1 bg-slate-50" aria-busy="true">
			<div className="border-b bg-white">
				<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
					<div className="h-10 w-64 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
					<div className="mt-4 h-6 w-full max-w-xl animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
					<div className="mt-7 h-12 w-full max-w-3xl animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
				</div>
			</div>
			<p className="sr-only">Loading exams…</p>
		</main>
	)
}
