import type { Metadata } from "next"
import { Suspense } from "react"

import { Skeleton } from "@/components/shadcn/skeleton"
import { StatisticsPage } from "@/features/statistics/pages/statistics.page"

export const metadata: Metadata = { title: "Statistics" }

export default function Page() {
	return <Suspense fallback={<Skeleton className="m-8 h-80" />}><StatisticsPage /></Suspense>
}
