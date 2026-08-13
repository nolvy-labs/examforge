import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LocaleMessage } from "@/components/locale/locale-message"
import type { LocaleMessageId } from "@/i18n/locale.type"
import { renderWithProviders } from "../../support/render"

describe("LocaleMessage", () => {
	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => undefined)
	})

	it("renders a plain message in a React fragment", () => {
		const { container } = renderWithProviders(<LocaleMessage messageId="common.continue" />)

		expect(screen.getByText("Continue")).toBeInTheDocument()
		expect(container.childElementCount).toBe(0)
		expect(container.textContent).toBe("Continue")
	})

	it("renders string and numeric interpolation values", () => {
		const { container } = renderWithProviders(
			<>
				<LocaleMessage messageId="dashboard.welcome" values={{ name: "Lan" }} />
				<LocaleMessage messageId="exams.questions" values={{ count: 2 }} />
			</>
		)

		expect(container).toHaveTextContent("Welcome back, Lan2 questions")
	})

	it("renders rich chunks through a React callback without adding a wrapper", () => {
		const messages = { common: { continue: "Read <link>this guide</link>." } }
		const { container } = render(
			<NextIntlClientProvider locale="en" messages={messages}>
				<LocaleMessage
					messageId={"common.continue" as LocaleMessageId}
					values={{
						link: (chunks: ReactNode) => <a href="/guide">{chunks}</a>,
					}}
				/>
			</NextIntlClientProvider>
		)

		expect(screen.getByRole("link", { name: "this guide" })).toHaveAttribute("href", "/guide")
		expect(container.textContent).toBe("Read this guide.")
		expect(container.firstElementChild?.tagName).toBe("A")
	})

	it("falls back to the message ID and logs a useful development diagnostic when translation fails", () => {
		vi.stubEnv("NODE_ENV", "test")
		const onError = (error: unknown) => { throw error }

		render(
			<NextIntlClientProvider locale="en" messages={{}} onError={onError}>
				<LocaleMessage messageId={"missing.message" as LocaleMessageId} />
			</NextIntlClientProvider>
		)

		expect(screen.getByText("missing.message")).toBeInTheDocument()
		expect(console.error).toHaveBeenCalledWith(
			'[i18n] Could not resolve message "missing.message".',
			expect.anything()
		)
	})

	it("falls back without the development diagnostic in production", () => {
		vi.stubEnv("NODE_ENV", "production")
		const onError = (error: unknown) => { throw error }

		render(
			<NextIntlClientProvider locale="en" messages={{}} onError={onError}>
				<LocaleMessage messageId={"missing.production" as LocaleMessageId} />
			</NextIntlClientProvider>
		)

		expect(screen.getByText("missing.production")).toBeInTheDocument()
		expect(console.error).not.toHaveBeenCalled()
	})
})
