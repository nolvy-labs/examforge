import { create } from "zustand"

import type { AuthUser } from "@/features/auth/types/auth.type"

export type AuthSession =
	| { status: "uninitialized"; user: null }
	| { status: "initializing"; user: null }
	| { status: "anonymous"; user: null }
	| { status: "authenticated"; user: AuthUser }

interface AuthActions {
	beginInitialization: () => number | null
	beginTransition: () => number
	setAuthenticated: (user: AuthUser, transitionId: number) => boolean
	clearSession: (transitionId?: number) => boolean
}

interface AuthState {
	session: AuthSession
	transitionId: number
	actions: AuthActions
}

const useAuthStore = create<AuthState>((set, get) => ({
	session: { status: "uninitialized", user: null },
	transitionId: 0,
	actions: {
		beginInitialization: () => {
			if (get().session.status !== "uninitialized") return null

			const transitionId = get().transitionId + 1
			set({
				transitionId,
				session: { status: "initializing", user: null },
			})
			return transitionId
		},
		beginTransition: () => {
			const transitionId = get().transitionId + 1
			set({ transitionId })
			return transitionId
		},
		setAuthenticated: (user, transitionId) => {
			if (get().transitionId !== transitionId) return false
			set({ session: { status: "authenticated", user } })
			return true
		},
		clearSession: (transitionId) => {
			if (transitionId !== undefined && get().transitionId !== transitionId) return false

			set((state) => ({
				transitionId: state.transitionId + 1,
				session: { status: "anonymous", user: null },
			}))
			return true
		},
	},
}))

export const useAuthSession = () => useAuthStore((state) => state.session)
export const useAuthActions = () => useAuthStore((state) => state.actions)
