"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import { AUTH_ROUTES } from "@/features/auth/auth.constants"
import { AuthLoading } from "@/features/auth/components/auth.loading"
import { useAuthSession } from "@/features/auth/stores/auth.store"

export function StudentGuard({ children }: { children: React.ReactNode }) {
	const router = useRouter()
	const pathname = usePathname()
	const session = useAuthSession()

	useEffect(() => {
		if (session.status === "guest") {
			const callbackUrl = `${pathname}${window.location.search}`
			router.replace(`${AUTH_ROUTES.signin}?callbackUrl=${encodeURIComponent(callbackUrl)}`)
		}
	}, [pathname, router, session.status])

	if (session.status !== "authenticated") {
		return <AuthLoading variant="dashboard" />
	}

	return children
}
