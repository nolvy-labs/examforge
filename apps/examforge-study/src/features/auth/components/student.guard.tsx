"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import { AUTH_ROUTES } from "@/features/auth/auth.constants"
import { AuthLoading } from "@/features/auth/components/auth.loading"
import { useAuthStore } from "@/features/auth/stores/auth.store"

export function StudentGuard({ children }: { children: React.ReactNode }) {
	const router = useRouter()
	const pathname = usePathname()
	const isInitialized = useAuthStore((state) => state.isInitialized)
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

	useEffect(() => {
		if (isInitialized && !isAuthenticated) {
			const callbackUrl = `${pathname}${window.location.search}`
			router.replace(`${AUTH_ROUTES.signin}?callbackUrl=${encodeURIComponent(callbackUrl)}`)
		}
	}, [isAuthenticated, isInitialized, pathname, router])

	if (!isInitialized || !isAuthenticated) {
		return <AuthLoading variant="dashboard" />
	}

	return children
}
