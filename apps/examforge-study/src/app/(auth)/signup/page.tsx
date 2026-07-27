import type { Metadata } from "next"

import { SignupPage } from "@/features/auth/pages/signup.page"

export const metadata: Metadata = {
	title: "Create account",
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