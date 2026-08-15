import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LocaleSwitcher } from "@/components/locale/locale-switcher"
import { LOCALE_STORAGE_KEY } from "@/i18n/locale.constants"
import messages from "../../../messages/en.json"
import {
	refresh,
	resetNextNavigationMocks,
} from "../../support/next-navigation.mock"

const mocks = vi.hoisted(() => ({
	setLocale: vi.fn(),
	toastError: vi.fn(),
}))

vi.mock("@/i18n/actions/set-locale.action", () => ({ setLocale: mocks.setLocale }))
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }))
vi.mock("next/navigation", async () => import("../../support/next-navigation.mock"))

function renderSwitcher(locale: "en" | "vi" = "en") {
	return render(
		<NextIntlClientProvider locale={locale} messages={messages}>
			<LocaleSwitcher />
		</NextIntlClientProvider>
	)
}

async function openSwitcher() {
	const user = userEvent.setup()
	await user.click(screen.getByRole("combobox", { name: "Choose language" }))
	return user
}

describe("LocaleSwitcher", () => {
	beforeEach(() => {
		resetNextNavigationMocks()
		mocks.setLocale.mockReset().mockResolvedValue(undefined)
		mocks.toastError.mockReset()
		localStorage.clear()
	})

	it("shows the active locale and all supported options", async () => {
		renderSwitcher("en")
		expect(screen.getByRole("combobox", { name: "Choose language" })).toHaveTextContent("English")

		await openSwitcher()

		expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument()
		expect(screen.getByRole("option", { name: "Vietnamese" })).toBeInTheDocument()
	})

	it("does not write or refresh when the active locale is selected", async () => {
		renderSwitcher("en")
		const user = await openSwitcher()

		await user.click(screen.getByRole("option", { name: "English" }))

		expect(mocks.setLocale).not.toHaveBeenCalled()
		expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull()
		expect(refresh).not.toHaveBeenCalled()
	})

	it("writes the server cookie and localStorage then refreshes after success", async () => {
		renderSwitcher("en")
		const user = await openSwitcher()

		await user.click(screen.getByRole("option", { name: "Vietnamese" }))

		await waitFor(() => expect(mocks.setLocale).toHaveBeenCalledWith("vi"))
		await waitFor(() => expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("vi"))
		expect(refresh).toHaveBeenCalledOnce()
	})

	it("does not write localStorage and displays a localized toast after failure", async () => {
		mocks.setLocale.mockRejectedValue(new Error("cookie rejected"))
		renderSwitcher("en")
		const user = await openSwitcher()

		await user.click(screen.getByRole("option", { name: "Vietnamese" }))

		await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(
			"We couldn't change the language. Please try again."
		))
		expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull()
		expect(refresh).not.toHaveBeenCalled()
	})

	it("disables the control and prevents duplicate changes while pending", async () => {
		let resolve!: () => void
		mocks.setLocale.mockReturnValue(new Promise<void>((done) => { resolve = done }))
		renderSwitcher("en")
		const user = await openSwitcher()

		await user.click(screen.getByRole("option", { name: "Vietnamese" }))
		await waitFor(() => expect(screen.getByRole("combobox", { name: "Choose language" })).toBeDisabled())
		await user.click(screen.getByRole("combobox", { name: "Choose language" }))
		expect(mocks.setLocale).toHaveBeenCalledOnce()

		resolve()
		await waitFor(() => expect(refresh).toHaveBeenCalledOnce())
	})

	it("ignores matching cross-tab state and refreshes for a different locale", () => {
		renderSwitcher("en")

		window.dispatchEvent(new StorageEvent("storage", {
			key: LOCALE_STORAGE_KEY,
			newValue: "en",
		}))
		expect(refresh).not.toHaveBeenCalled()

		window.dispatchEvent(new StorageEvent("storage", {
			key: LOCALE_STORAGE_KEY,
			newValue: "vi",
		}))
		expect(refresh).toHaveBeenCalledOnce()
	})

	it("removes the storage listener on unmount", () => {
		const remove = vi.spyOn(window, "removeEventListener")
		const view = renderSwitcher("en")

		view.unmount()

		expect(remove).toHaveBeenCalledWith("storage", expect.any(Function))
	})

	it("does not expose or accept an unsupported public option", async () => {
		renderSwitcher("en")
		const user = await openSwitcher()

		await user.keyboard("French{Enter}")

		expect(screen.queryByRole("option", { name: "French" })).not.toBeInTheDocument()
		expect(mocks.setLocale).not.toHaveBeenCalled()
	})
})
