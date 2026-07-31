"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"

import { ADMIN_ROUTES, getSafeAdminReturnUrl } from "@/features/auth/auth.constants"
import { isAdminUser } from "@/features/auth/authorization"
import { AuthLoading } from "@/features/auth/components/auth.loading"
import { useAuthSession } from "@/features/auth/stores/auth.store"

export function AdminGuard({ children }: { children: React.ReactNode }) {
	const router = useRouter()
	const pathname = usePathname()
	const session = useAuthSession()
	const redirectedFor = useRef<string | null>(null)

	useEffect(() => {
		if (session.status !== "anonymous") {
			redirectedFor.current = null
			return
		}

		const requestedUrl = getSafeAdminReturnUrl(`${pathname}${window.location.search}`)
		if (redirectedFor.current === requestedUrl) return
		redirectedFor.current = requestedUrl
		router.replace(`${ADMIN_ROUTES.signin}?returnUrl=${encodeURIComponent(requestedUrl)}`)
	}, [pathname, router, session.status])

	if (session.status !== "authenticated" || !isAdminUser(session.user)) {
		return <AuthLoading />
	}

	return children
}
