"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { AuthLoading } from "@/features/auth/components/auth.loading"
import { STUDENT_LANDING_ROUTE } from "@/features/auth/auth.constants"
import { useAuthSession } from "@/features/auth/stores/auth.store"

export function GuestGuard({ children }: { children: React.ReactNode }) {
	const router = useRouter()
	const session = useAuthSession()

	useEffect(() => {
		if (session.status === "authenticated") {
			router.replace(STUDENT_LANDING_ROUTE)
		}
	}, [router, session.status])

	if (session.status !== "guest") {
		return <AuthLoading />
	}

	return children
}
