"use client"

import { useAuthStore } from "@/features/auth/stores/auth.store"

function getWelcomeName(displayName: string | null | undefined, email: string) {
	return displayName?.trim() || email.split("@")[0] || "Student"
}

export function DashboardWelcome() {
	const user = useAuthStore((state) => state.user)
	const name = getWelcomeName(user?.displayName, user?.email ?? "")

	return (
		<section aria-labelledby="welcome-heading">
			<p className="text-sm font-medium text-indigo-600">Student dashboard</p>
			<h1 id="welcome-heading" className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
				Welcome back, {name}
			</h1>
			<p className="mt-3 max-w-2xl text-slate-600">
				When you are ready, choose a practice exam and keep building your understanding one session at a time.
			</p>
		</section>
	)
}