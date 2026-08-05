import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { DashboardPage } from "@/features/dashboard/pages/dashboard.page"

export async function generateMetadata(): Promise<Metadata> {
	return { title: (await getTranslations("metadata"))("dashboard") }
}

export default function Page() {
	return <DashboardPage />
}