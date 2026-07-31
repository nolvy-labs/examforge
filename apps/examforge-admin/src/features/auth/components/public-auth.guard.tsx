"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { ADMIN_ROUTES } from "@/features/auth/auth.constants"
import { isAdminUser } from "@/features/auth/authorization"
import { AuthLoading } from "@/features/auth/components/auth.loading"
import { useAuthSession } from "@/features/auth/stores/auth.store"

export function PublicAuthGuard({ children }: { children: React.ReactNode }) {
	const router = useRouter()
	const session = useAuthSession()
	const isAdmin = session.status === "authenticated" && isAdminUser(session.user)

	useEffect(() => {
		if (isAdmin) router.replace(ADMIN_ROUTES.defaultProtected)
	}, [isAdmin, router])

	if (session.status !== "anonymous") return <AuthLoading />

	return children
}
