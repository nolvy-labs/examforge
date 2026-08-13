import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SigninForm } from "@/features/auth/components/signin.form"
import type { SigninRequest } from "@/features/auth/types/auth.type"
import { ApiError } from "@/lib/api/api.error"
import {
	replace,
	resetNextNavigationMocks,
} from "../../support/next-navigation.mock"
import { renderWithProviders } from "../../support/render"

interface SigninCallbacks {
	onSuccess: () => void
	onError: (error: unknown) => void
}

const signinMutation = vi.hoisted(() => ({
	error: null as unknown,
	isPending: false,
	mutate: vi.fn<(request: SigninRequest, callbacks: SigninCallbacks) => void>(),
}))

vi.mock("@/features/auth/hooks/auth.hook", () => ({
	useSigninMutation: () => signinMutation,
}))
vi.mock("next/navigation", async () => import("../../support/next-navigation.mock"))

async function fillValidSignin() {
	const user = userEvent.setup()
	await user.type(screen.getByLabelText("Email"), "student@example.com")
	await user.type(screen.getByLabelText("Password"), "secret")
	return user
}

describe("SigninForm", () => {
	beforeEach(() => {
		resetNextNavigationMocks()
		signinMutation.error = null
		signinMutation.isPending = false
		signinMutation.mutate.mockReset()
	})

	it("renders accessible email and password controls", () => {
		renderWithProviders(<SigninForm />)

		expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("type", "email")
		expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password")
		expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled()
	})

	it("prevents mutation when client validation fails", async () => {
		const user = userEvent.setup()
		renderWithProviders(<SigninForm />)

		await user.type(screen.getByLabelText("Email"), "not-an-email")
		await user.click(screen.getByRole("button", { name: "Sign in" }))

		expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument()
		expect(screen.getByText("Password is required.")).toBeInTheDocument()
		expect(signinMutation.mutate).not.toHaveBeenCalled()
	})

	it("submits the validated credentials", async () => {
		renderWithProviders(<SigninForm />)
		const user = await fillValidSignin()

		await user.click(screen.getByRole("button", { name: "Sign in" }))

		await waitFor(() => expect(signinMutation.mutate).toHaveBeenCalledWith(
			{ email: "student@example.com", password: "secret" },
			expect.any(Object)
		))
	})

	it("disables submission while pending and prevents duplicate mutation calls", async () => {
		signinMutation.isPending = true
		const user = userEvent.setup()
		renderWithProviders(<SigninForm />)

		const submit = screen.getByRole("button", { name: "Signing in…" })
		expect(submit).toBeDisabled()
		await user.click(submit)
		await user.click(submit)
		expect(signinMutation.mutate).not.toHaveBeenCalled()
	})

	it("clears the password and redirects through the safe redirect helper after success", async () => {
		signinMutation.mutate.mockImplementation((_request, callbacks) => callbacks.onSuccess())
		renderWithProviders(<SigninForm callbackUrl="https://evil.example/steal" />)
		const user = await fillValidSignin()

		await user.click(screen.getByRole("button", { name: "Sign in" }))

		await waitFor(() => expect(screen.getByLabelText("Password")).toHaveValue(""))
		expect(screen.getByLabelText("Email")).toHaveValue("student@example.com")
		expect(replace).toHaveBeenCalledWith("/dashboard")
	})

	it("attaches server field errors case-insensitively to the matching controls", async () => {
		const error = new ApiError({
			code: "validation",
			message: "Invalid fields",
			fieldErrors: {
				EMAIL: ["Invalid"],
				Password: ["Invalid"],
			},
		})
		signinMutation.mutate.mockImplementation((_request, callbacks) => callbacks.onError(error))
		renderWithProviders(<SigninForm />)
		const user = await fillValidSignin()

		await user.click(screen.getByRole("button", { name: "Sign in" }))

		expect(await screen.findAllByText("Please check this field.")).toHaveLength(2)
	})

	it("localizes and displays a general API error", () => {
		vi.spyOn(console, "error").mockImplementation(() => undefined)
		signinMutation.error = new ApiError({
			code: "server",
			message: "Internal server detail",
		})

		renderWithProviders(<SigninForm />)

		expect(screen.getByText("We could not sign you in")).toBeInTheDocument()
		expect(screen.getByText("The service is temporarily unavailable. Please try again later.")).toBeInTheDocument()
	})
})
