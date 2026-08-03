import type { Metadata } from "next"
import { Suspense } from "react"

import { Skeleton } from "@/components/shadcn/skeleton"
import { HistoryPage } from "@/features/history/pages/history.page"

export const metadata: Metadata = { title: "Attempt History" }

export default function Page() {
	return <Suspense fallback={<Skeleton className="m-8 h-64" />}><HistoryPage /></Suspense>
}
