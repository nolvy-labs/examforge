import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	LOCALE_COOKIE_MAX_AGE,
	LOCALE_COOKIE_NAME,
} from "@/i18n/locale.constants"
import type { Locale } from "@/i18n/locale.type"

const mocks = vi.hoisted(() => ({
	cookies: vi.fn(),
	set: vi.fn(),
}))

vi.mock("next/headers", () => ({ cookies: mocks.cookies }))

import { setLocale } from "@/i18n/actions/set-locale.action"

describe("setLocale server action", () => {
	beforeEach(() => {
		mocks.cookies.mockReset().mockResolvedValue({ set: mocks.set })
		mocks.set.mockReset()
		vi.stubEnv("NODE_ENV", "test")
	})

	it.each(["en", "vi"] as const)("writes the %s locale cookie with canonical semantics", async (locale) => {
		await setLocale(locale)

		expect(mocks.set).toHaveBeenCalledWith(LOCALE_COOKIE_NAME, locale, {
			path: "/",
			sameSite: "lax",
			maxAge: LOCALE_COOKIE_MAX_AGE,
			secure: false,
			httpOnly: false,
		})
		expect(LOCALE_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365)
	})

	it("sets secure in production", async () => {
		vi.stubEnv("NODE_ENV", "production")

		await setLocale("en")

		expect(mocks.set).toHaveBeenCalledWith(
			LOCALE_COOKIE_NAME,
			"en",
			expect.objectContaining({ secure: true })
		)
	})

	it("throws before reading or mutating cookies for an invalid runtime value", async () => {
		await expect(setLocale("fr" as Locale)).rejects.toThrow("Invalid locale")

		expect(mocks.cookies).not.toHaveBeenCalled()
		expect(mocks.set).not.toHaveBeenCalled()
	})
})
