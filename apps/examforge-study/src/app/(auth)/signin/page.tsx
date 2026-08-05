import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { SigninPage } from "@/features/auth/pages/signin.page"

export async function generateMetadata(): Promise<Metadata> {
	return { title: (await getTranslations("metadata"))("signIn") }
}

interface SigninRouteProps {
	searchParams: Promise<{
		callbackUrl?: string | string[]
		returnUrl?: string | string[]
	}>
}

function firstValue(value?: string | string[]) {
	return Array.isArray(value) ? value[0] : value
}

export default async function Page({ searchParams }: SigninRouteProps) {
	const params = await searchParams
	const callbackUrl = firstValue(params.callbackUrl) ?? firstValue(params.returnUrl)

	return <SigninPage callbackUrl={callbackUrl} />
}
