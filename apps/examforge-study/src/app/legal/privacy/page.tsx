import type { Metadata } from "next"
import { getLocale } from "next-intl/server"

import { createLegalMetadata } from "@/features/legal/legal.metadata"
import { LegalPage } from "@/features/legal/pages/legal.page"

export async function generateMetadata(): Promise<Metadata> {
	return createLegalMetadata("privacy", await getLocale())
}

export default async function Page() {
	return <LegalPage document="privacy" locale={await getLocale()} />
}
