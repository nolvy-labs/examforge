import { describe, expect, it } from "vitest"

import {
	buildPatchOperations,
	chunkOperations,
	type SaveSnapshot,
} from "@/features/attempt/attempt-workspace/utils/attempt-patch"

function snapshot(overrides: Partial<SaveSnapshot> = {}): SaveSnapshot {
	return {
		answers: {},
		generations: {},
		fields: {},
		...overrides,
	}
}

describe("buildPatchOperations", () => {
	it("creates textAnswer and selectedOptionIds replacements in supplied dirty order", () => {
		const input = snapshot({
			answers: {
				fill: { textAnswer: "answer", selectedOptionIds: [] },
				choice: { textAnswer: null, selectedOptionIds: ["a", "b"] },
			},
			generations: { fill: 1, choice: 2 },
			fields: { fill: "text", choice: "options" },
		})

		expect(buildPatchOperations(input)).toEqual([
			{ op: "replace", path: "/answers/fill/textAnswer", value: "answer" },
			{ op: "replace", path: "/answers/choice/selectedOptionIds", value: ["a", "b"] },
		])
	})

	it("deduplicates option IDs without mutating the snapshot", () => {
		const selectedOptionIds = ["a", "a", "b"]
		const input = snapshot({
			answers: { choice: { textAnswer: null, selectedOptionIds } },
			generations: { choice: 1 },
			fields: { choice: "options" },
		})

		expect(buildPatchOperations(input)[0]?.value).toEqual(["a", "b"])
		expect(selectedOptionIds).toEqual(["a", "a", "b"])
	})

	it("includes only dirty answers and safely skips missing answers", () => {
		const input = snapshot({
			answers: {
				dirty: { textAnswer: "dirty", selectedOptionIds: [] },
				clean: { textAnswer: "clean", selectedOptionIds: [] },
			},
			generations: { dirty: 1, missing: 1 },
			fields: { dirty: "text", clean: "text", missing: "text" },
		})

		expect(buildPatchOperations(input)).toEqual([
			{ op: "replace", path: "/answers/dirty/textAnswer", value: "dirty" },
		])
	})

	it("returns no operations for an empty snapshot", () => {
		expect(buildPatchOperations(snapshot())).toEqual([])
	})
})

describe("chunkOperations", () => {
	const operations = (count: number) => Array.from({ length: count }, (_, index) => ({
		op: "replace" as const,
		path: `/answers/${index}/textAnswer`,
		value: String(index),
	}))

	it.each([
		[0, []],
		[100, [100]],
		[101, [100, 1]],
		[200, [100, 100]],
		[201, [100, 100, 1]],
	] as const)("chunks %i operations at the default size", (count, sizes) => {
		const input = operations(count)
		const chunks = chunkOperations(input)
		expect(chunks.map(({ length }) => length)).toEqual(sizes)
		expect(chunks.flat()).toEqual(input)
	})

	it("supports a custom chunk size", () => {
		expect(chunkOperations(operations(5), 2).map(({ length }) => length)).toEqual([2, 2, 1])
	})
})
