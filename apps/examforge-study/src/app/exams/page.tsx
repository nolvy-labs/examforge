import type { Metadata } from "next"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { MainHeader } from "@/components/layout/header/header"
import { Skeleton } from "@/components/shadcn/skeleton"
import { ExamBrowsePage } from "@/features/exams/exam-browse/pages/exam-browse.page"
import { LocaleMessage } from "@/components/locale/locale-message"

export async function generateMetadata(): Promise<Metadata> {
	const translate = await getTranslations("metadata")
	return { title: translate("exams"), description: translate("examsDescription") }
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
		<main className="flex-1 bg-muted/30">
			<div className="border-b bg-background">
				<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
					<Skeleton className="h-10 w-64" />
					<Skeleton className="mt-4 h-6 w-full max-w-xl" />
					<Skeleton className="mt-7 h-12 w-full max-w-3xl" />
				</div>
			</div>
			<p className="sr-only"><LocaleMessage messageId="accessibility.loadingExams" /></p>
		</main>
	)
}
