import type { Metadata } from "next"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { Skeleton } from "@/components/shadcn/skeleton"
import { StatisticsPage } from "@/features/statistics/pages/statistics.page"

export async function generateMetadata(): Promise<Metadata> {
	return { title: (await getTranslations("metadata"))("statistics") }
}

export default function Page() {
	return <Suspense fallback={<Skeleton className="m-8 h-80" />}><StatisticsPage /></Suspense>
}
