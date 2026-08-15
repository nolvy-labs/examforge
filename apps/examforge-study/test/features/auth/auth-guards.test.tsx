import { screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AuthSession } from "@/features/auth/stores/auth.store"
import { GuestGuard } from "@/features/auth/components/guest.guard"
import { StudentGuard } from "@/features/auth/components/student.guard"
import { STUDENT_LANDING_ROUTE } from "@/features/auth/auth.constants"
import { buildAuthUser } from "../../support/auth-user"
import {
	pathname,
	replace,
	resetNextNavigationMocks,
} from "../../support/next-navigation.mock"
import { renderWithProviders } from "../../support/render"

const authStoreMock = vi.hoisted(() => ({
	useAuthSession: vi.fn(),
}))

vi.mock("@/features/auth/stores/auth.store", () => authStoreMock)
vi.mock("next/navigation", async () => import("../../support/next-navigation.mock"))

function setSession(session: AuthSession) {
	authStoreMock.useAuthSession.mockReturnValue(session)
}

describe("GuestGuard", () => {
	beforeEach(() => {
		resetNextNavigationMocks()
	})

	it("renders children for a guest", () => {
		setSession({ status: "guest", user: null })

		renderWithProviders(<GuestGuard><div>Guest content</div></GuestGuard>)

		expect(screen.getByText("Guest content")).toBeInTheDocument()
		expect(replace).not.toHaveBeenCalled()
	})

	it("renders loading UI while authentication is loading", () => {
		setSession({ status: "loading", user: null })

		renderWithProviders(<GuestGuard><div>Guest content</div></GuestGuard>)

		expect(screen.getByText("Loading ExamForge")).toBeInTheDocument()
		expect(screen.queryByText("Guest content")).not.toBeInTheDocument()
	})

	it("redirects authenticated users without briefly exposing protected guest children", async () => {
		setSession({ status: "authenticated", user: buildAuthUser() })

		renderWithProviders(<GuestGuard><div>Guest content</div></GuestGuard>)

		expect(screen.queryByText("Guest content")).not.toBeInTheDocument()
		expect(screen.getByText("Loading ExamForge")).toBeInTheDocument()
		await waitFor(() => expect(replace).toHaveBeenCalledWith(STUDENT_LANDING_ROUTE))
	})
})

describe("StudentGuard", () => {
	beforeEach(() => {
		resetNextNavigationMocks()
		window.history.replaceState({}, "", "/")
	})

	it("renders children for an authenticated user", () => {
		setSession({ status: "authenticated", user: buildAuthUser() })

		renderWithProviders(<StudentGuard><div>Student content</div></StudentGuard>)

		expect(screen.getByText("Student content")).toBeInTheDocument()
		expect(replace).not.toHaveBeenCalled()
	})

	it("renders dashboard loading UI while authentication is loading", () => {
		setSession({ status: "loading", user: null })

		renderWithProviders(<StudentGuard><div>Student content</div></StudentGuard>)

		expect(screen.getByText("Loading your dashboard")).toBeInTheDocument()
		expect(screen.queryByText("Student content")).not.toBeInTheDocument()
	})

	it("redirects guests with an encoded pathname and query callback without rendering children", async () => {
		setSession({ status: "guest", user: null })
		pathname.mockReturnValue("/exams/science test")
		window.history.replaceState({}, "", "/?mode=practice&tag=biology%20one")

		renderWithProviders(<StudentGuard><div>Student content</div></StudentGuard>)

		expect(screen.queryByText("Student content")).not.toBeInTheDocument()
		expect(screen.getByText("Loading your dashboard")).toBeInTheDocument()
		await waitFor(() => expect(replace).toHaveBeenCalledWith(
			"/signin?callbackUrl=%2Fexams%2Fscience%20test%3Fmode%3Dpractice%26tag%3Dbiology%2520one"
		))
	})
})
