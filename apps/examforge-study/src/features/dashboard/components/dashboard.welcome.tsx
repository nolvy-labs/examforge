"use client"

import { useRequiredAuthUser } from "@/features/auth/stores/auth.store"
import { useMemo } from "react";
import { LocaleMessage } from "@/components/locale/locale-message"
import { useTranslations } from "next-intl"

export function DashboardWelcome() {
	const user = useRequiredAuthUser();
	const translate = useTranslations("auth")

	const displayName = useMemo(() => {
		return user.displayName?.trim() || user.email?.split("@")[0] || translate("studentFallback")
	}, [translate, user])

	return (
		<section>
			<h1 id="welcome-heading" className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
				<LocaleMessage messageId="dashboard.welcome" values={{ name: displayName }} />
			</h1>
			<p className="mt-3 max-w-2xl text-neutral-600">
				<LocaleMessage messageId="dashboard.description" />
			</p>
		</section>
	)
}