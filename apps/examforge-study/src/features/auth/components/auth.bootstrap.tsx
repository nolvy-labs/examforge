"use client"

import { useAuthInitialization } from "@/features/auth/hooks/auth.hook"

export function AuthBootstrap() {
	useAuthInitialization()

	return null
}
