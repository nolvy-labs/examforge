import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
	useAttemptActions,
	useAttemptAnswer,
	useAttemptAnswers,
	useAttemptChangeSequence,
	useAttemptDirtyCount,
	useAttemptIdentity,
	useAttemptLocked,
	useAttemptNavigation,
	useAttemptPracticeElapsed,
	useAttemptSaveStatus,
} from "@/features/attempt/attempt-workspace/stores/attempt.store"
import {
	ATTEMPT_IDS,
	buildAttemptDetail,
	buildAttemptSection,
	buildFillBlankQuestion,
	buildLocalAttemptDraft,
	buildSingleSelectQuestion,
} from "../../../support/attempt"

function usePublicWorkspace() {
	return {
		identity: useAttemptIdentity(),
		answers: useAttemptAnswers(),
		navigation: useAttemptNavigation(),
		save: useAttemptSaveStatus(),
		locked: useAttemptLocked(),
		dirtyCount: useAttemptDirtyCount(),
		changeSequence: useAttemptChangeSequence(),
		practiceElapsed: useAttemptPracticeElapsed(),
		actions: useAttemptActions(),
	}
}

describe("attempt workspace store", () => {
	beforeEach(() => {
		localStorage.clear()
		const { result } = renderHook(() => useAttemptActions())
		act(() => result.current.reset())
	})

	afterEach(() => {
		const { result } = renderHook(() => useAttemptActions())
		act(() => result.current.reset())
	})

	it("initializes server answers, field kinds, first location, elapsed time, and display preference", () => {
		localStorage.setItem("examforge-attempt-display", "section")
		const detail = buildAttemptDetail()
		const local = buildLocalAttemptDraft({ practiceElapsedMs: 17_000, dirtyAnswers: {}, answers: {} })
		const workspace = renderHook(() => usePublicWorkspace())

		act(() => workspace.result.current.actions.initialize(detail, '"3"', ATTEMPT_IDS.student, local))

		expect(workspace.result.current.identity).toBe(ATTEMPT_IDS.attempt)
		expect(workspace.result.current.answers.drafts[ATTEMPT_IDS.fill]).toEqual({
			textAnswer: "server text",
			selectedOptionIds: [],
		})
		expect(workspace.result.current.navigation).toEqual({
			selectedSectionId: ATTEMPT_IDS.section,
			selectedBlockId: ATTEMPT_IDS.fill,
			displayMode: "section",
		})
		expect(workspace.result.current.practiceElapsed).toBe(17_000)
		expect(workspace.result.current.actions.getSnapshot().fields).toEqual({})
	})

	it("derives text and option field kinds when those answers become dirty", () => {
		const workspace = renderHook(() => usePublicWorkspace())
		act(() => workspace.result.current.actions.initialize(buildAttemptDetail(), '"3"', ATTEMPT_IDS.student, null))
		act(() => {
			workspace.result.current.actions.setText(ATTEMPT_IDS.fill, "changed")
			workspace.result.current.actions.setOptions(ATTEMPT_IDS.single, [ATTEMPT_IDS.optionB])
		})

		expect(workspace.result.current.actions.getSnapshot().fields).toEqual({
			[ATTEMPT_IDS.fill]: "text",
			[ATTEMPT_IDS.single]: "options",
		})
	})

	it("restores practice elapsed only for compatible practice drafts", () => {
		const workspace = renderHook(() => usePublicWorkspace())
		act(() => workspace.result.current.actions.initialize(
			buildAttemptDetail({ mode: "exam" }),
			'"3"',
			ATTEMPT_IDS.student,
			buildLocalAttemptDraft({ mode: "exam", practiceElapsedMs: 99_000 })
		))
		expect(workspace.result.current.practiceElapsed).toBe(0)
	})

	it("reinitializing the same attempt preserves local edits", () => {
		const workspace = renderHook(() => usePublicWorkspace())
		act(() => workspace.result.current.actions.initialize(buildAttemptDetail(), '"3"', ATTEMPT_IDS.student, null))
		act(() => workspace.result.current.actions.setText(ATTEMPT_IDS.fill, "local edit"))
		act(() => workspace.result.current.actions.initialize(
			buildAttemptDetail({ revision: 4 }),
			'"4"',
			ATTEMPT_IDS.student,
			null
		))

		expect(workspace.result.current.answers.drafts[ATTEMPT_IDS.fill]?.textAnswer).toBe("local edit")
		expect(workspace.result.current.actions.getConcurrency()).toEqual({ etag: '"3"', revision: 3 })
	})

	it("merges only known dirty local answers over server state", () => {
		const local = buildLocalAttemptDraft({
			answers: {
				[ATTEMPT_IDS.fill]: { textAnswer: "dirty local", selectedOptionIds: [] },
				[ATTEMPT_IDS.single]: { textAnswer: null, selectedOptionIds: [ATTEMPT_IDS.optionB] },
				unknown: { textAnswer: "unknown", selectedOptionIds: [] },
			},
			dirtyAnswers: { [ATTEMPT_IDS.fill]: 2, unknown: 1 },
		})
		const workspace = renderHook(() => usePublicWorkspace())

		act(() => workspace.result.current.actions.initialize(buildAttemptDetail(), '"3"', ATTEMPT_IDS.student, local))

		expect(workspace.result.current.answers.drafts[ATTEMPT_IDS.fill]?.textAnswer).toBe("dirty local")
		expect(workspace.result.current.answers.drafts[ATTEMPT_IDS.single]?.selectedOptionIds).toEqual([ATTEMPT_IDS.optionA])
		expect(workspace.result.current.answers.drafts.unknown).toBeUndefined()
		expect(workspace.result.current.answers.dirty).toEqual({ [ATTEMPT_IDS.fill]: 2 })
	})

	it("edits increment generations and sequence, deduplicate options, wait, and persist", () => {
		const setItem = vi.spyOn(Storage.prototype, "setItem")
		const workspace = renderHook(() => usePublicWorkspace())
		act(() => workspace.result.current.actions.initialize(buildAttemptDetail(), '"3"', ATTEMPT_IDS.student, null))

		act(() => workspace.result.current.actions.setText(ATTEMPT_IDS.fill, "first"))
		act(() => workspace.result.current.actions.setText(ATTEMPT_IDS.fill, "second"))
		act(() => workspace.result.current.actions.setOptions(ATTEMPT_IDS.multi, [ATTEMPT_IDS.optionA, ATTEMPT_IDS.optionA, ATTEMPT_IDS.optionB]))

		expect(workspace.result.current.answers.dirty).toEqual({
			[ATTEMPT_IDS.fill]: 2,
			[ATTEMPT_IDS.multi]: 1,
		})
		expect(workspace.result.current.changeSequence).toBe(3)
		expect(workspace.result.current.save.saveState).toBe("waiting")
		expect(workspace.result.current.answers.drafts[ATTEMPT_IDS.multi]?.selectedOptionIds).toEqual([
			ATTEMPT_IDS.optionA,
			ATTEMPT_IDS.optionB,
		])
		expect(setItem).toHaveBeenCalled()
	})

	it("ignores edits while hard locked", () => {
		const workspace = renderHook(() => usePublicWorkspace())
		act(() => workspace.result.current.actions.initialize(buildAttemptDetail(), '"3"', ATTEMPT_IDS.student, null))
		act(() => workspace.result.current.actions.setLocked(true))
		act(() => workspace.result.current.actions.setText(ATTEMPT_IDS.fill, "ignored"))

		expect(workspace.result.current.answers.drafts[ATTEMPT_IDS.fill]?.textAnswer).toBe("server text")
		expect(workspace.result.current.dirtyCount).toBe(0)
	})

	it("returns a defensive dirty-only snapshot", () => {
		const workspace = renderHook(() => usePublicWorkspace())
		act(() => workspace.result.current.actions.initialize(buildAttemptDetail(), '"3"', ATTEMPT_IDS.student, null))
		act(() => workspace.result.current.actions.setOptions(ATTEMPT_IDS.single, [ATTEMPT_IDS.optionB]))

		const snapshot = workspace.result.current.actions.getSnapshot()
		snapshot.answers[ATTEMPT_IDS.single]!.selectedOptionIds.push("mutated")
		snapshot.generations[ATTEMPT_IDS.single] = 99

		expect(workspace.result.current.answers.drafts[ATTEMPT_IDS.single]?.selectedOptionIds).toEqual([ATTEMPT_IDS.optionB])
		expect(workspace.result.current.answers.dirty[ATTEMPT_IDS.single]).toBe(1)
		expect(snapshot.answers[ATTEMPT_IDS.fill]).toBeUndefined()
	})

	it("acknowledges unchanged generations while preserving edits made in flight", () => {
		const workspace = renderHook(() => usePublicWorkspace())
		act(() => workspace.result.current.actions.initialize(buildAttemptDetail(), '"3"', ATTEMPT_IDS.student, null))
		act(() => workspace.result.current.actions.setText(ATTEMPT_IDS.fill, "sent"))
		const snapshot = workspace.result.current.actions.getSnapshot()
		act(() => workspace.result.current.actions.setText(ATTEMPT_IDS.fill, "newer"))

		act(() => workspace.result.current.actions.acknowledge(snapshot, '"4"', 4))

		expect(workspace.result.current.answers.dirty[ATTEMPT_IDS.fill]).toBe(2)
		expect(workspace.result.current.save.saveState).toBe("waiting")
		expect(workspace.result.current.actions.getConcurrency()).toEqual({ etag: '"4"', revision: 4 })
		const newer = workspace.result.current.actions.getSnapshot()
		act(() => workspace.result.current.actions.acknowledge(newer, '"5"', 5))
		expect(workspace.result.current.dirtyCount).toBe(0)
		expect(workspace.result.current.save.saveState).toBe("saved")
	})

	it("rebases clean values, preserves dirty values, updates concurrency, and persists", () => {
		const setItem = vi.spyOn(Storage.prototype, "setItem")
		const workspace = renderHook(() => usePublicWorkspace())
		act(() => workspace.result.current.actions.initialize(buildAttemptDetail(), '"3"', ATTEMPT_IDS.student, null))
		act(() => workspace.result.current.actions.setText(ATTEMPT_IDS.fill, "dirty local"))
		const latest = buildAttemptDetail({
			revision: 8,
			sections: [buildAttemptSection({
				questions: [
					buildFillBlankQuestion({ answer: { textAnswer: "latest server", selectedOptionIds: [] } }),
					buildSingleSelectQuestion({ answer: { textAnswer: null, selectedOptionIds: [ATTEMPT_IDS.optionB] } }),
				],
			})],
		})

		act(() => workspace.result.current.actions.rebase(latest, '"8"'))

		expect(workspace.result.current.answers.drafts[ATTEMPT_IDS.fill]?.textAnswer).toBe("dirty local")
		expect(workspace.result.current.answers.drafts[ATTEMPT_IDS.single]?.selectedOptionIds).toEqual([ATTEMPT_IDS.optionB])
		expect(workspace.result.current.actions.getConcurrency()).toEqual({ etag: '"8"', revision: 8 })
		expect(setItem).toHaveBeenCalled()
	})

	it("reports unavailable local storage and reset removes all prior attempt state", () => {
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full") })
		const workspace = renderHook(() => usePublicWorkspace())
		const answer = renderHook(() => useAttemptAnswer(ATTEMPT_IDS.fill))
		act(() => workspace.result.current.actions.initialize(buildAttemptDetail(), '"3"', ATTEMPT_IDS.student, null))
		act(() => workspace.result.current.actions.setText(ATTEMPT_IDS.fill, "local only"))

		expect(workspace.result.current.save.saveMessage).toBe(
			"Local storage is unavailable. Keep this tab open until answers synchronize."
		)
		act(() => workspace.result.current.actions.reset())
		expect(workspace.result.current.identity).toBeNull()
		expect(workspace.result.current.answers).toEqual({ drafts: {}, dirty: {} })
		expect(workspace.result.current.navigation.selectedSectionId).toBeNull()
		expect(answer.result.current).toBeUndefined()
	})
})
