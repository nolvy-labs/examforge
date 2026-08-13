import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	useAuthInitialization,
	useLogoutMutation,
	useSigninMutation,
	useSignupMutation,
} from "@/features/auth/hooks/auth.hook"
import {
	useAuthActions,
	useAuthSession,
} from "@/features/auth/stores/auth.store"
import { buildAuthUser } from "../../support/auth-user"
import {
	createTestQueryClient,
	createTestWrapper,
} from "../../support/render"

const mocks = vi.hoisted(() => ({
	getCurrentUser: vi.fn(),
	signin: vi.fn(),
	signup: vi.fn(),
	logout: vi.fn(),
	registerAuthFailureHandler: vi.fn(),
}))

vi.mock("@/features/auth/api/auth.api", () => ({
	authApi: {
		getCurrentUser: mocks.getCurrentUser,
		signin: mocks.signin,
		signup: mocks.signup,
		logout: mocks.logout,
	},
}))

vi.mock("@/lib/api/api.client", () => ({
	registerAuthFailureHandler: mocks.registerAuthFailureHandler,
}))

function publicAuthState() {
	const session = renderHook(() => useAuthSession())
	const actions = renderHook(() => useAuthActions())
	return { session, actions }
}

describe("auth hooks", () => {
	beforeEach(() => {
		mocks.getCurrentUser.mockReset()
		mocks.signin.mockReset()
		mocks.signup.mockReset()
		mocks.logout.mockReset()
		mocks.registerAuthFailureHandler.mockReset()
		mocks.registerAuthFailureHandler.mockReturnValue(vi.fn())
		const { actions } = publicAuthState()
		act(() => actions.result.current.clearUser())
	})

	it("initialization success stores the authenticated user", async () => {
		const user = buildAuthUser()
		mocks.getCurrentUser.mockResolvedValue(user)
		const queryClient = createTestQueryClient()
		const { session } = publicAuthState()

		renderHook(() => useAuthInitialization(), {
			wrapper: createTestWrapper({ queryClient }),
		})

		await waitFor(() => expect(session.result.current).toEqual({
			status: "authenticated",
			user,
		}))
	})

	it("initialization failure clears the session and does not retry", async () => {
		const { session, actions } = publicAuthState()
		act(() => actions.result.current.setUser(buildAuthUser()))
		mocks.getCurrentUser.mockRejectedValue(new Error("Unauthorized"))

		renderHook(() => useAuthInitialization(), {
			wrapper: createTestWrapper(),
		})

		await waitFor(() => expect(session.result.current).toEqual({
			status: "guest",
			user: null,
		}))
		expect(mocks.getCurrentUser).toHaveBeenCalledOnce()
	})

	it("registers the auth failure handler and unregisters it on cleanup", () => {
		mocks.getCurrentUser.mockImplementation(() => new Promise(() => undefined))
		const unregister = vi.fn()
		mocks.registerAuthFailureHandler.mockReturnValue(unregister)

		const { unmount } = renderHook(() => useAuthInitialization(), {
			wrapper: createTestWrapper(),
		})

		expect(mocks.registerAuthFailureHandler).toHaveBeenCalledOnce()
		const handler = mocks.registerAuthFailureHandler.mock.calls[0]?.[0]
		expect(handler).toEqual(expect.any(Function))
		unmount()
		expect(unregister).toHaveBeenCalledOnce()
	})

	it("sign-in success stores the returned user", async () => {
		const user = buildAuthUser()
		mocks.signin.mockResolvedValue(user)
		const { session } = publicAuthState()
		const mutation = renderHook(() => useSigninMutation(), {
			wrapper: createTestWrapper(),
		})

		await act(() => mutation.result.current.mutateAsync({
			email: "student@example.com",
			password: "secret",
		}))

		expect(session.result.current).toEqual({ status: "authenticated", user })
	})

	it("signup success stores the returned user", async () => {
		const user = buildAuthUser({ displayName: "New Student" })
		mocks.signup.mockResolvedValue(user)
		const { session } = publicAuthState()
		const mutation = renderHook(() => useSignupMutation(), {
			wrapper: createTestWrapper(),
		})

		await act(() => mutation.result.current.mutateAsync({
			displayName: "New Student",
			email: "new@example.com",
			password: "secret",
		}))

		expect(session.result.current).toEqual({ status: "authenticated", user })
	})

	it("logout clears the user and current-user query even when the request fails", async () => {
		const queryClient = createTestQueryClient()
		const user = buildAuthUser()
		queryClient.setQueryData(["auth", "current-user"], user)
		mocks.logout.mockRejectedValue(new Error("Network failure"))
		const { session, actions } = publicAuthState()
		act(() => actions.result.current.setUser(user))
		const mutation = renderHook(() => useLogoutMutation(), {
			wrapper: createTestWrapper({ queryClient }),
		})

		await act(async () => {
			await expect(mutation.result.current.mutateAsync()).rejects.toThrow("Network failure")
		})

		expect(session.result.current).toEqual({ status: "guest", user: null })
		expect(queryClient.getQueryData(["auth", "current-user"])).toBeUndefined()
	})

	it("creates independent QueryClient instances for separate tests and renders", () => {
		const first = createTestQueryClient()
		const second = createTestQueryClient()
		first.setQueryData(["auth", "current-user"], buildAuthUser())

		expect(first).not.toBe(second)
		expect(second.getQueryData(["auth", "current-user"])).toBeUndefined()
	})
})
