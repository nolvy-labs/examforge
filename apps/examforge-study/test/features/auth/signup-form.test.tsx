import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SignupForm } from "@/features/auth/components/signup.form"
import type { SignupRequest } from "@/features/auth/types/auth.type"
import { ApiError } from "@/lib/api/api.error"
import {
	replace,
	resetNextNavigationMocks,
} from "../../support/next-navigation.mock"
import { renderWithProviders } from "../../support/render"

interface SignupCallbacks {
	onSuccess: () => void
	onError: (error: unknown) => void
}

const signupMutation = vi.hoisted(() => ({
	error: null as unknown,
	isPending: false,
	mutate: vi.fn<(request: SignupRequest, callbacks: SignupCallbacks) => void>(),
}))

vi.mock("@/features/auth/hooks/auth.hook", () => ({
	useSignupMutation: () => signupMutation,
}))
vi.mock("next/navigation", async () => import("../../support/next-navigation.mock"))

async function fillValidSignup({ displayName = "Study Student" } = {}) {
	const user = userEvent.setup()
	await user.type(screen.getByLabelText("Display name"), displayName)
	await user.type(screen.getByLabelText("Email"), "student@example.com")
	await user.type(screen.getByLabelText("Password"), "secret")
	await user.type(screen.getByLabelText("Confirm password"), "secret")
	return user
}

describe("SignupForm", () => {
	beforeEach(() => {
		resetNextNavigationMocks()
		signupMutation.error = null
		signupMutation.isPending = false
		signupMutation.mutate.mockReset()
	})

	it("reports all required fields without calling the mutation", async () => {
		const user = userEvent.setup()
		renderWithProviders(<SignupForm />)

		await user.click(screen.getByRole("button", { name: "Create account" }))

		expect(await screen.findByText("Display name is required.")).toBeInTheDocument()
		expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument()
		expect(screen.getByText("Password is required.")).toBeInTheDocument()
		expect(screen.getByText("Confirm your password.")).toBeInTheDocument()
		expect(signupMutation.mutate).not.toHaveBeenCalled()
	})

	it("rejects an invalid email and password mismatch", async () => {
		const user = userEvent.setup()
		renderWithProviders(<SignupForm />)

		await user.type(screen.getByLabelText("Display name"), "Student")
		await user.type(screen.getByLabelText("Email"), "invalid")
		await user.type(screen.getByLabelText("Password"), "secret")
		await user.type(screen.getByLabelText("Confirm password"), "different")
		await user.click(screen.getByRole("button", { name: "Create account" }))

		expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument()
		expect(screen.getByText("Passwords do not match.")).toBeInTheDocument()
		expect(signupMutation.mutate).not.toHaveBeenCalled()
	})

	it("enforces the display-name maximum length", async () => {
		const user = userEvent.setup()
		renderWithProviders(<SignupForm />)
		fireEvent.change(screen.getByLabelText("Display name"), {
			target: { value: "a".repeat(101) },
		})
		await user.type(screen.getByLabelText("Email"), "student@example.com")
		await user.type(screen.getByLabelText("Password"), "secret")
		await user.type(screen.getByLabelText("Confirm password"), "secret")

		await user.click(screen.getByRole("button", { name: "Create account" }))

		expect(await screen.findByText("Name must be 100 characters or fewer.")).toBeInTheDocument()
		expect(signupMutation.mutate).not.toHaveBeenCalled()
	})

	it("trims the display name and omits confirmPassword from a valid API payload", async () => {
		renderWithProviders(<SignupForm />)
		const user = await fillValidSignup({ displayName: "  Study Student  " })

		await user.click(screen.getByRole("button", { name: "Create account" }))

		await waitFor(() => expect(signupMutation.mutate).toHaveBeenCalledWith({
			displayName: "Study Student",
			email: "student@example.com",
			password: "secret",
		}, expect.any(Object)))
		expect(signupMutation.mutate.mock.calls[0]?.[0]).not.toHaveProperty("confirmPassword")
	})

	it("disables submission while pending and prevents duplicate mutation calls", async () => {
		signupMutation.isPending = true
		const user = userEvent.setup()
		renderWithProviders(<SignupForm />)

		const submit = screen.getByRole("button", { name: "Creating account…" })
		expect(submit).toBeDisabled()
		await user.click(submit)
		await user.click(submit)
		expect(signupMutation.mutate).not.toHaveBeenCalled()
	})

	it("resets the form and redirects safely after success", async () => {
		signupMutation.mutate.mockImplementation((_request, callbacks) => callbacks.onSuccess())
		renderWithProviders(<SignupForm callbackUrl="//evil.example/steal" />)
		const user = await fillValidSignup()

		await user.click(screen.getByRole("button", { name: "Create account" }))

		await waitFor(() => expect(screen.getByLabelText("Password")).toHaveValue(""))
		expect(screen.getByLabelText("Display name")).toHaveValue("")
		expect(replace).toHaveBeenCalledWith("/dashboard")
	})

	it("matches backend field names case-insensitively", async () => {
		const error = new ApiError({
			code: "validation",
			message: "Invalid fields",
			fieldErrors: {
				DISPLAYNAME: ["Invalid"],
				Email: ["Invalid"],
				PASSWORD: ["Invalid"],
			},
		})
		signupMutation.mutate.mockImplementation((_request, callbacks) => callbacks.onError(error))
		renderWithProviders(<SignupForm />)
		const user = await fillValidSignup()

		await user.click(screen.getByRole("button", { name: "Create account" }))

		expect(await screen.findAllByText("Please check this field.")).toHaveLength(3)
	})

	it("localizes and displays a general API error", () => {
		vi.spyOn(console, "error").mockImplementation(() => undefined)
		signupMutation.error = new ApiError({
			code: "conflict",
			message: "Backend detail",
		})

		renderWithProviders(<SignupForm />)

		expect(screen.getByText("We could not create your account")).toBeInTheDocument()
		expect(screen.getByText("That information is already in use.")).toBeInTheDocument()
	})
})
