import type { Metadata } from "next"

import { SigninPage } from "@/features/auth/pages/signin.page"

export const metadata: Metadata = {
	title: "Sign in",
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
