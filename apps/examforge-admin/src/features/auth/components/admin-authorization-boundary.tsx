"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

import { authApi } from "@/features/auth/api/auth.api"
import { ADMIN_ROUTES } from "@/features/auth/auth.constants"
import { isAdminUser } from "@/features/auth/authorization"
import { AuthLoading } from "@/features/auth/components/auth.loading"
import { useAuthActions, useAuthSession } from "@/features/auth/stores/auth.store"

let nonAdminLogoutPromise: Promise<void> | null = null

function logoutNonAdminAccount() {
	if (!nonAdminLogoutPromise) {
		nonAdminLogoutPromise = authApi.logout()
			.catch(() => undefined)
			.finally(() => {
				nonAdminLogoutPromise = null
			})
	}

	return nonAdminLogoutPromise
}

export function AdminAuthorizationBoundary({ children }: { children: React.ReactNode }) {
	const router = useRouter()
	const session = useAuthSession()
	const actions = useAuthActions()
	const handledUserId = useRef<string | null>(null)
	const isNonAdmin = session.status === "authenticated" && !isAdminUser(session.user)

	useEffect(() => {
		if (!isNonAdmin) {
			handledUserId.current = null
			return
		}

		if (handledUserId.current === session.user.id) return
		handledUserId.current = session.user.id

		void logoutNonAdminAccount().then(() => {
			actions.clearSession()
			router.replace(ADMIN_ROUTES.accessDenied)
		})
	}, [actions, isNonAdmin, router, session])

	if (isNonAdmin) return <AuthLoading label="Verifying admin access" />

	return children
}
