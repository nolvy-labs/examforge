import { create } from "zustand"

import type { AuthUser } from "@/features/auth/types/auth.type"

interface AuthState {
	user: AuthUser | null
	isAuthenticated: boolean
	isInitialized: boolean
	setUser: (user: AuthUser) => void
	clearUser: () => void
	finishInitialization: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	isAuthenticated: false,
	isInitialized: false,
	setUser: (user) =>
		set({
			user,
			isAuthenticated: true,
			isInitialized: true,
		}),
	clearUser: () =>
		set({
			user: null,
			isAuthenticated: false,
		}),
	finishInitialization: () => set({ isInitialized: true }),
}))
