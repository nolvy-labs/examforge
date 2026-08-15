import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { buildAuthUser } from "../../support/auth-user"

describe("auth store public hooks", () => {
	beforeEach(() => {
		vi.resetModules()
	})

	it("starts loading, authenticates a user, and clears the session", async () => {
		const {
			useAuthActions,
			useAuthSession,
			useRequiredAuthUser,
		} = await import("@/features/auth/stores/auth.store")
		const session = renderHook(() => useAuthSession())
		const actions = renderHook(() => useAuthActions())
		const requiredUser = renderHook(() => useRequiredAuthUser())
		const user = buildAuthUser()

		expect(session.result.current).toEqual({ status: "loading", user: null })

		act(() => actions.result.current.setUser(user))
		expect(session.result.current).toEqual({ status: "authenticated", user })
		expect(requiredUser.result.current).toBe(user)

		act(() => actions.result.current.clearUser())
		expect(session.result.current).toEqual({ status: "guest", user: null })
	})

	it("does not leak state across isolated module instances", async () => {
		const firstStore = await import("@/features/auth/stores/auth.store")
		const firstActions = renderHook(() => firstStore.useAuthActions())
		act(() => firstActions.result.current.setUser(buildAuthUser()))

		vi.resetModules()
		const secondStore = await import("@/features/auth/stores/auth.store")
		const secondSession = renderHook(() => secondStore.useAuthSession())

		expect(secondSession.result.current).toEqual({ status: "loading", user: null })
	})
})
