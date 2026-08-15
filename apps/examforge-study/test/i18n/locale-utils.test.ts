import { describe, expect, it } from "vitest"

import { isLocale, resolveLocale } from "@/i18n/locale.utils"

describe("isLocale", () => {
	it.each([
		["en", true],
		["vi", true],
		["fr", false],
		["en-US", false],
		["vi-VN", false],
		["", false],
		[null, false],
		[undefined, false],
		[1, false],
		[{}, false],
		[[], false],
	] as const)("classifies %j", (value, expected) => {
		expect(isLocale(value)).toBe(expected)
	})
})

describe("resolveLocale", () => {
	it.each([
		["en", "vi;q=1", "en"],
		["vi", "en;q=1", "vi"],
	] as const)("gives valid cookie %s precedence over %s", (cookie, header, expected) => {
		expect(resolveLocale(cookie, header)).toBe(expected)
	})

	it("falls through from an invalid cookie to browser preference", () => {
		expect(resolveLocale("fr", "vi-VN")).toBe("vi")
	})

	it.each([
		["vi", "vi"],
		["vi-VN", "vi"],
		["en", "en"],
		["en-US", "en"],
		["fr, vi, en", "vi"],
		["en;q=0.4, vi;q=0.9", "vi"],
		["vi;q=0.8, en;q=0.8", "vi"],
		["en;q=0.8, vi;q=0.8", "en"],
		["  VI-vn ; Q = 0.9 , EN-us ; q=0.5 ", "vi"],
		["fr;q=1, *;q=0.5", "en"],
		["fr, de", "en"],
		["vi;q=0, en;q=0.5", "en"],
		["vi;q=banana, en;q=0.5", "en"],
		["vi;q=1.1, en;q=0.5", "en"],
		["vi;q=-0.1, en;q=0.5", "en"],
		["vi;q=.9, en;q=0.5", "en"],
		["vi;q=0.1234, en;q=0.5", "en"],
		["vi;q=1.0000, en;q=0.5", "en"],
		["", "en"],
		[" , ;q=0.9, vi;q=nope", "en"],
	] as const)("resolves Accept-Language %j to %s", (header, expected) => {
		expect(resolveLocale(null, header)).toBe(expected)
	})

	it.each([null, undefined])("defaults to English for a missing header", (header) => {
		expect(resolveLocale(undefined, header)).toBe("en")
	})
})
