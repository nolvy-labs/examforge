import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { ForgotPasswordPage } from "@/features/auth/pages/forgot-password.page"

export async function generateMetadata(): Promise<Metadata> {
	return { title: (await getTranslations("metadata"))("forgotPassword") }
}

export default function Page() {
	return <ForgotPasswordPage />
}