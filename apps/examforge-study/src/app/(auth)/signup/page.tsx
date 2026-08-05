import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { SignupPage } from "@/features/auth/pages/signup.page"

export async function generateMetadata(): Promise<Metadata> {
	return { title: (await getTranslations("metadata"))("signUp") }
}

interface SignupRouteProps {
	searchParams: Promise<{
		callbackUrl?: string | string[]
	}>
}

export default async function Page({ searchParams }: SignupRouteProps) {
	const { callbackUrl } = await searchParams
	const value = Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl

	return <SignupPage callbackUrl={value} />
}