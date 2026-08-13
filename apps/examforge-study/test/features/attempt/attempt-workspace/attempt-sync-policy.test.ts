import { describe, expect, it } from "vitest"

import {
	EXAM_MAX_DIRTY_WINDOW_MS,
	EXAM_SYNC_DEBOUNCE_MS,
	PRACTICE_SYNC_WINDOW_MS,
	getSyncDeadline,
} from "@/features/attempt/attempt-workspace/model/attempt-sync-policy"

describe("getSyncDeadline", () => {
	it("uses a two-minute deadline from the first dirty practice change", () => {
		expect(PRACTICE_SYNC_WINDOW_MS).toBe(120_000)
		expect(getSyncDeadline("practice", 1_000, 1_000)).toBe(121_000)
	})

	it("does not postpone a practice deadline after later edits", () => {
		expect(getSyncDeadline("practice", 1_000, 100_000)).toBe(121_000)
	})

	it("debounces exam synchronization ten seconds after the latest edit", () => {
		expect(EXAM_SYNC_DEBOUNCE_MS).toBe(10_000)
		expect(getSyncDeadline("exam", 1_000, 20_000)).toBe(30_000)
	})

	it("caps exam synchronization sixty seconds after the first dirty change", () => {
		expect(EXAM_MAX_DIRTY_WINDOW_MS).toBe(60_000)
		expect(getSyncDeadline("exam", 1_000, 59_000)).toBe(61_000)
	})

	it.each([
		[51_000, 61_000],
		[60_000, 61_000],
		[61_000, 61_000],
	])("honors the maximum dirty-window boundary at latest edit %i", (latest, expected) => {
		expect(getSyncDeadline("exam", 1_000, latest)).toBe(expected)
	})
})
