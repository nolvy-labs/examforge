"use client"

import { useEffect } from "react"
import { useMutation } from "@tanstack/react-query"

import { authApi } from "@/features/auth/api/auth.api"
import { useAuthActions } from "@/features/auth/stores/auth.store"
import type { SigninRequest } from "@/features/auth/types/auth.type"
import { registerAuthFailureHandler } from "@/lib/api/api.client"
import { ApiError } from "@/lib/api/api.error"

async function clearMalformedServerSession(error: unknown) {
	if (error instanceof ApiError && error.code === "invalid-response") {
		await authApi.logout().catch(() => undefined)
	}
}

export function useAuthInitialization() {
	const actions = useAuthActions()

	useEffect(
		() => registerAuthFailureHandler(() => actions.clearSession()),
		[actions]
	)

	useEffect(() => {
		const transitionId = actions.beginInitialization()
		if (transitionId === null) return

		void authApi.getCurrentUser().then(
			(user) => {
				actions.setAuthenticated(user, transitionId)
			},
			async (error: unknown) => {
				await clearMalformedServerSession(error)
				actions.clearSession(transitionId)
			}
		)
	}, [actions])
}

export function useSigninMutation() {
	const actions = useAuthActions()

	return useMutation({
		mutationFn: async (request: SigninRequest) => {
			const transitionId = actions.beginTransition()

			try {
				const user = await authApi.signin(request)
				const accepted = actions.setAuthenticated(user, transitionId)
				return { accepted, user }
			} catch (error) {
				await clearMalformedServerSession(error)
				actions.clearSession(transitionId)
				throw error
			}
		},
	})
}
