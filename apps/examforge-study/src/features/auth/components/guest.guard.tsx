"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { AuthLoading } from "@/features/auth/components/auth.loading"
import { STUDENT_LANDING_ROUTE } from "@/features/auth/auth.constants"
import { useAuthStore } from "@/features/auth/stores/auth.store"

export function GuestGuard({ children }: { children: React.ReactNode }) {
	const router = useRouter()
	const isInitialized = useAuthStore((state) => state.isInitialized)
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

	useEffect(() => {
		if (isInitialized && isAuthenticated) {
			router.replace(STUDENT_LANDING_ROUTE)
		}
	}, [isAuthenticated, isInitialized, router])

	if (!isInitialized || isAuthenticated) {
		return <AuthLoading />
	}

	return children
}
