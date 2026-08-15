import { describe, expect, it } from "vitest"

import en from "../../messages/en.json"
import vi from "../../messages/vi.json"

type MessageLeaf = string | null | undefined | number | boolean | unknown[]
type FlatMessages = Record<string, MessageLeaf>

function flattenMessages(value: unknown, prefix = "", output: FlatMessages = {}) {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		output[prefix] = value as MessageLeaf
		return output
	}

	for (const [key, child] of Object.entries(value)) {
		const path = prefix ? `${prefix}.${key}` : key
		if (child && typeof child === "object" && !Array.isArray(child)) {
			flattenMessages(child, path, output)
		} else {
			output[path] = child as MessageLeaf
		}
	}
	return output
}

function interpolationVariables(message: string) {
	return [...message.matchAll(/\{\s*([A-Za-z][\w]*)\s*(?=[,}])/g)]
		.map((match) => match[1])
		.filter((value): value is string => Boolean(value))
		.sort()
}

function richTagPlaceholders(message: string) {
	return [...message.matchAll(/<\/?([A-Za-z][\w-]*)\s*>/g)]
		.map((match) => match[1])
		.filter((value): value is string => Boolean(value))
		.sort()
}

describe("English/Vietnamese message contract", () => {
	const english = flattenMessages(en)
	const vietnamese = flattenMessages(vi)
	const englishPaths = Object.keys(english).sort()
	const vietnamesePaths = Object.keys(vietnamese).sort()

	it("has exactly the same leaf paths", () => {
		expect(vietnamesePaths).toEqual(englishPaths)
	})

	it.each([
		["English", english],
		["Vietnamese", vietnamese],
	] as const)("contains only non-empty string leaves in %s", (_language, messages) => {
		for (const [path, value] of Object.entries(messages)) {
			expect(typeof value, path).toBe("string")
			expect((value as string).trim().length, path).toBeGreaterThan(0)
			expect(value, path).not.toBeNull()
			expect(Array.isArray(value), path).toBe(false)
		}
	})

	it("keeps ICU variable identifiers compatible", () => {
		for (const path of englishPaths) {
			expect(
				interpolationVariables(vietnamese[path] as string),
				path
			).toEqual(interpolationVariables(english[path] as string))
		}
	})

	it("keeps rich-text tag placeholders compatible", () => {
		for (const path of englishPaths) {
			expect(
				richTagPlaceholders(vietnamese[path] as string),
				path
			).toEqual(richTagPlaceholders(english[path] as string))
		}
	})
})
