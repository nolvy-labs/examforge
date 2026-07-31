
import type { Metadata } from "next"

import { SigninPage } from "@/features/auth/pages/signin.page"

export const metadata: Metadata = { title: "Sign in" }

interface SigninRouteProps {
	searchParams: Promise<{ returnUrl?: string | string[] }>
}

export default async function Page({ searchParams }: SigninRouteProps) {
	const params = await searchParams
	const returnUrl = Array.isArray(params.returnUrl) ? params.returnUrl[0] : params.returnUrl
	return <SigninPage returnUrl={returnUrl} />
}
