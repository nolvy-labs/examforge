import { create } from "zustand"

import type { AuthUser } from "@/features/auth/types/auth.type"

export type AuthSession =
	| {
		status: "loading"
		user: null
	}
	| {
		status: "guest"
		user: null
	}
	| {
		status: "authenticated"
		user: AuthUser
	}

interface AuthActions {
	setUser: (user: AuthUser) => void
	clearUser: () => void
}

interface AuthState {
	session: AuthSession
	actions: AuthActions
}

const useAuthStore = create<AuthState>((set) => ({
	session: {
		status: "loading",
		user: null,
	},
	actions: {
		setUser: (user) => set({
			session: {
				status: "authenticated",
				user,
			},
		}),
		clearUser: () => set({
			session: {
				status: "guest",
				user: null,
			},
		}),
	},
}))

export const useAuthSession = () => useAuthStore((state) => state.session)
export const useRequiredAuthUser = () => useAuthStore((state) => state.session.user!)
export const useAuthActions = () => useAuthStore((state) => state.actions)
