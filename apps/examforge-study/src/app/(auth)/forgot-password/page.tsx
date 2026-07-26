import type { Metadata } from "next"

import { ForgotPasswordPage } from "@/features/auth/pages/forgot-password.page"

export const metadata: Metadata = {
	title: "Forgot password",
}

export default function Page() {
	return <ForgotPasswordPage />
}