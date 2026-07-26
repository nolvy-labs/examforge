import type { Metadata } from "next"

import { ResetPasswordPage } from "@/features/auth/pages/reset-password.page"

export const metadata: Metadata = {
	title: "Reset password",
}

interface ResetPasswordRouteProps {
	searchParams: Promise<{
		token?: string | string[]
	}>
}

export default async function Page({
	searchParams,
}: ResetPasswordRouteProps) {
	const { token } = await searchParams
	const tokenValue = Array.isArray(token) ? token[0] : token

	return <ResetPasswordPage hasToken={Boolean(tokenValue?.trim())} />
}