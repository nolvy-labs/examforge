"use client"

import { useEffect } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"

import { authApi } from "@/features/auth/api/auth.api"
import { useAuthStore } from "@/features/auth/stores/auth.store"
import type {
	SigninRequest,
	SignupRequest,
} from "@/features/auth/types/auth.type"
import { registerAuthFailureHandler } from "@/lib/api/api.client"

const CURRENT_USER_QUERY_KEY = ["auth", "current-user"] as const

export function useAuthInitialization() {
	const setUser = useAuthStore((state) => state.setUser)
	const clearUser = useAuthStore((state) => state.clearUser)
	const finishInitialization = useAuthStore(
		(state) => state.finishInitialization
	)

	useEffect(
		() => registerAuthFailureHandler(() => clearUser()),
		[clearUser]
	)

	const currentUserQuery = useQuery({
		queryKey: CURRENT_USER_QUERY_KEY,
		queryFn: authApi.getCurrentUser,
		retry: false,
		staleTime: 60_000,
	})

	useEffect(() => {
		if (currentUserQuery.data) {
			setUser(currentUserQuery.data)
		} else if (currentUserQuery.isError) {
			clearUser()
		}

		if (currentUserQuery.isSuccess || currentUserQuery.isError) {
			finishInitialization()
		}
	}, [
		clearUser,
		currentUserQuery.data,
		currentUserQuery.isError,
		currentUserQuery.isSuccess,
		finishInitialization,
		setUser,
	])
}

export function useSigninMutation() {
	const setUser = useAuthStore((state) => state.setUser)

	return useMutation({
		mutationFn: (request: SigninRequest) => authApi.signin(request),
		onSuccess: setUser,
	})
}

export function useSignupMutation() {
	const setUser = useAuthStore((state) => state.setUser)

	return useMutation({
		mutationFn: (request: SignupRequest) => authApi.signup(request),
		onSuccess: setUser,
	})
}
