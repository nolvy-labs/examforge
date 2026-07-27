import { describe, expect, it } from "vitest"

import {
	parseExamBrowseParams,
	serializeExamBrowseState,
} from "./exam-browse.params"
import type { ExamBrowseState } from "./exam-browse.types"

describe("serializeExamBrowseState", () => {
	it("preserves supported state and unrelated query parameters without mutation", () => {
		const state: ExamBrowseState = {
			search: " algebra ",
			category: "mathematics",
			tagIds: ["TAG-2", "tag-1"],
			sort: "oldest",
			page: 3,
		}
		const originalState = structuredClone(state)
		const current = new URLSearchParams(
			"q=old&category=old&tags=old&sort=newest&page=8&utm_source=library"
		)
		const originalCurrent = current.toString()

		const serialized = serializeExamBrowseState(state, current)

		expect(parseExamBrowseParams(serialized)).toEqual({
			search: "algebra",
			category: "mathematics",
			tagIds: ["tag-1", "tag-2"],
			sort: "oldest",
			page: 3,
		})
		expect(serialized.get("utm_source")).toBe("library")
		expect(state).toEqual(originalState)
		expect(current.toString()).toBe(originalCurrent)
	})
})
