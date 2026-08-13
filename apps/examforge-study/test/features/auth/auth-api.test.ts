import { beforeEach, describe, expect, it, vi } from "vitest"

import { AUTH_API_ROUTES } from "@/features/auth/auth.constants"
import { buildAuthUser } from "../../support/auth-user"

const apiClientMock = vi.hoisted(() => ({
	get: vi.fn(),
	post: vi.fn(),
}))

vi.mock("@/lib/api/api.client", () => ({ apiClient: apiClientMock }))

import { authApi } from "@/features/auth/api/auth.api"

describe("authApi", () => {
	beforeEach(() => {
		apiClientMock.get.mockReset()
		apiClientMock.post.mockReset()
	})

	it("signs in with the correct POST route and payload, then returns response data", async () => {
		const user = buildAuthUser()
		const request = { email: "student@example.com", password: "secret" }
		apiClientMock.post.mockResolvedValue({ data: user })

		await expect(authApi.signin(request)).resolves.toBe(user)
		expect(apiClientMock.post).toHaveBeenCalledWith(AUTH_API_ROUTES.signin, request)
	})

	it("signs up with the correct POST route and payload, then returns response data", async () => {
		const user = buildAuthUser()
		const request = {
			displayName: "Study Student",
			email: "student@example.com",
			password: "secret",
		}
		apiClientMock.post.mockResolvedValue({ data: user })

		await expect(authApi.signup(request)).resolves.toBe(user)
		expect(apiClientMock.post).toHaveBeenCalledWith(AUTH_API_ROUTES.signup, request)
	})

	it("gets the current user from the correct route and returns response data", async () => {
		const user = buildAuthUser()
		apiClientMock.get.mockResolvedValue({ data: user })

		await expect(authApi.getCurrentUser()).resolves.toBe(user)
		expect(apiClientMock.get).toHaveBeenCalledWith(AUTH_API_ROUTES.me)
	})

	it("logs out with the correct POST route and no invented payload", async () => {
		apiClientMock.post.mockResolvedValue({ data: undefined })

		await expect(authApi.logout()).resolves.toBeUndefined()
		expect(apiClientMock.post).toHaveBeenCalledWith(AUTH_API_ROUTES.logout)
	})
})
