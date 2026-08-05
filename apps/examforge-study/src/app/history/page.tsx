import type { Metadata } from "next"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { Skeleton } from "@/components/shadcn/skeleton"
import { HistoryPage } from "@/features/history/pages/history.page"

export async function generateMetadata(): Promise<Metadata> {
	return { title: (await getTranslations("metadata"))("history") }
}

export default function Page() {
	return <Suspense fallback={<Skeleton className="m-8 h-64" />}><HistoryPage /></Suspense>
}
