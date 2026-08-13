import { beforeEach, describe, expect, it, vi } from "vitest"

import en from "../../messages/en.json"
import viMessages from "../../messages/vi.json"

const mocks = vi.hoisted(() => ({
	cookies: vi.fn(),
	headers: vi.fn(),
cookieGet: vi.fn(),
	headerGet: vi.fn(),
}))

vi.mock("next/headers", () => ({
	cookies: mocks.cookies,
	headers: mocks.headers,
}))

vi.mock("next-intl/server", () => ({
	getRequestConfig: (callback: () => Promise<unknown>) => callback,
}))

import requestConfig from "@/i18n/request"
import { LOCALE_COOKIE_NAME } from "@/i18n/locale.constants"

interface ResolvedConfig {
	locale: "en" | "vi"
	messages: typeof en
	timeZone: string
}

async function resolveConfig() {
	return (await (requestConfig as unknown as () => Promise<ResolvedConfig>)())
}

describe("locale request configuration", () => {
	beforeEach(() => {
		mocks.cookies.mockReset().mockResolvedValue({ get: mocks.cookieGet })
		mocks.headers.mockReset().mockResolvedValue({ get: mocks.headerGet })
		mocks.cookieGet.mockReset().mockReturnValue(undefined)
		mocks.headerGet.mockReset().mockReturnValue(null)
	})

	it("reads both cookie and headers and loads the English dictionary selected by cookie", async () => {
		mocks.cookieGet.mockReturnValue({ value: "en" })
		mocks.headerGet.mockReturnValue("vi-VN")

		const config = await resolveConfig()

		expect(mocks.cookies).toHaveBeenCalledOnce()
		expect(mocks.headers).toHaveBeenCalledOnce()
		expect(mocks.cookieGet).toHaveBeenCalledWith(LOCALE_COOKIE_NAME)
		expect(mocks.headerGet).toHaveBeenCalledWith("accept-language")
		expect(config).toEqual({
			locale: "en",
			messages: en,
			timeZone: "Asia/Ho_Chi_Minh",
		})
	})

	it("loads the Vietnamese dictionary selected by cookie", async () => {
		mocks.cookieGet.mockReturnValue({ value: "vi" })

		const config = await resolveConfig()

		expect(config.locale).toBe("vi")
		expect(config.messages).toEqual(viMessages)
		expect(config.timeZone).toBe("Asia/Ho_Chi_Minh")
	})

	it("falls back to browser language and returns the matching dictionary", async () => {
		mocks.headerGet.mockReturnValue("vi-VN, en;q=0.5")

		const config = await resolveConfig()

		expect(config.locale).toBe("vi")
		expect(config.messages).toEqual(viMessages)
	})

	it("does not dynamically import an unsupported dictionary for an invalid cookie", async () => {
		mocks.cookieGet.mockReturnValue({ value: "../../secrets" })
		mocks.headerGet.mockReturnValue("fr-FR")

		await expect(resolveConfig()).resolves.toEqual({
			locale: "en",
			messages: en,
			timeZone: "Asia/Ho_Chi_Minh",
		})
	})
})
