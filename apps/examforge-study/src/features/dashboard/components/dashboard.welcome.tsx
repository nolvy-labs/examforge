"use client"

import { useRequiredAuthUser } from "@/features/auth/stores/auth.store"
import { useMemo } from "react";

export function DashboardWelcome() {
	const user = useRequiredAuthUser();

	const displayName = useMemo(() => {
		return user.displayName?.trim() || user.email?.split("@")[0] || "Student"
	}, [user])

	return (
		<section>
			<h1 id="welcome-heading" className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
				Welcome back, {displayName}
			</h1>
			<p className="mt-3 max-w-2xl text-neutral-600">
				When you are ready, choose a practice exam and keep building your understanding one session at a time.
			</p>
		</section>
	)
}