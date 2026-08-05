import type { Metadata } from "next"

import { createLegalMetadata } from "@/features/legal/legal.metadata"
import { resolveLegalLocale } from "@/features/legal/legal.validation"
import { LegalPage } from "@/features/legal/pages/legal.page"

interface Props { searchParams: Promise<{ lang?: string | string[] }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
	return createLegalMetadata("privacy", resolveLegalLocale((await searchParams).lang))
}

export default async function Page({ searchParams }: Props) {
	return <LegalPage document="privacy" locale={resolveLegalLocale((await searchParams).lang)} />
}
