import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
	attemptDraftKey,
	readAttemptDraft,
	removeAttemptDraft,
	writeAttemptDraft,
} from "@/features/attempt/attempt-workspace/persistence/attempt-draft.storage"
import {
	ATTEMPT_IDS,
	buildLocalAttemptDraft,
} from "../../../support/attempt"

describe("attempt draft persistence", () => {
	beforeEach(() => {
		localStorage.clear()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("keys drafts by both student and attempt identity", () => {
		expect(attemptDraftKey(ATTEMPT_IDS.student, ATTEMPT_IDS.attempt)).toBe(
			`examforge:attempt-draft:v1:${ATTEMPT_IDS.student}:${ATTEMPT_IDS.attempt}`
		)
	})

	it("writes and reads a valid draft while refreshing updatedAtUtc", () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-08-13T02:00:00.000Z"))
		const draft = buildLocalAttemptDraft()

		expect(writeAttemptDraft(draft)).toBe(true)
		expect(readAttemptDraft(
			ATTEMPT_IDS.student,
			ATTEMPT_IDS.attempt,
			ATTEMPT_IDS.version,
			"practice"
		)).toEqual({ ...draft, updatedAtUtc: "2026-08-13T02:00:00.000Z" })
		expect(draft.updatedAtUtc).not.toBe("2026-08-13T02:00:00.000Z")
	})

	it("returns null for a missing or corrupted draft", () => {
		expect(readAttemptDraft(ATTEMPT_IDS.student, ATTEMPT_IDS.attempt, ATTEMPT_IDS.version, "practice")).toBeNull()
		localStorage.setItem(attemptDraftKey(ATTEMPT_IDS.student, ATTEMPT_IDS.attempt), "{bad json")
		expect(readAttemptDraft(ATTEMPT_IDS.student, ATTEMPT_IDS.attempt, ATTEMPT_IDS.version, "practice")).toBeNull()
	})

	it.each([
		["invalid schema version", { schemaVersion: 2 }],
		["invalid ISO timestamp", { updatedAtUtc: "yesterday" }],
		["negative revision", { serverRevision: -1 }],
		["negative elapsed time", { practiceElapsedMs: -1 }],
	] as const)("rejects %s", (_label, override) => {
		localStorage.setItem(
			attemptDraftKey(ATTEMPT_IDS.student, ATTEMPT_IDS.attempt),
			JSON.stringify({ ...buildLocalAttemptDraft(), ...override })
		)
		expect(readAttemptDraft(ATTEMPT_IDS.student, ATTEMPT_IDS.attempt, ATTEMPT_IDS.version, "practice")).toBeNull()
	})

	it.each([
		["student mismatch", { studentId: "other-student" }, ATTEMPT_IDS.student, ATTEMPT_IDS.attempt, ATTEMPT_IDS.version, "practice"],
		["attempt mismatch", { attemptId: "other-attempt" }, ATTEMPT_IDS.student, ATTEMPT_IDS.attempt, ATTEMPT_IDS.version, "practice"],
		["exam version mismatch", {}, ATTEMPT_IDS.student, ATTEMPT_IDS.attempt, "other-version", "practice"],
		["mode mismatch", {}, ATTEMPT_IDS.student, ATTEMPT_IDS.attempt, ATTEMPT_IDS.version, "exam"],
	] as const)("rejects a %s", (_label, override, studentId, attemptId, versionId, mode) => {
		const stored = { ...buildLocalAttemptDraft(), ...override }
		localStorage.setItem(
			attemptDraftKey(studentId, attemptId),
			JSON.stringify(stored)
		)
		expect(readAttemptDraft(studentId, attemptId, versionId, mode)).toBeNull()
	})

	it("handles localStorage getItem, setItem, and removeItem failures", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked") })
		expect(readAttemptDraft(ATTEMPT_IDS.student, ATTEMPT_IDS.attempt, ATTEMPT_IDS.version, "practice")).toBeNull()
		vi.restoreAllMocks()

		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full") })
		expect(writeAttemptDraft(buildLocalAttemptDraft())).toBe(false)
		vi.restoreAllMocks()

		vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("blocked") })
		expect(() => removeAttemptDraft(ATTEMPT_IDS.student, ATTEMPT_IDS.attempt)).not.toThrow()
	})

	it("is safe without a browser window", () => {
		vi.stubGlobal("window", undefined)

		expect(readAttemptDraft(ATTEMPT_IDS.student, ATTEMPT_IDS.attempt, ATTEMPT_IDS.version, "practice")).toBeNull()
		expect(writeAttemptDraft(buildLocalAttemptDraft())).toBe(false)
		expect(() => removeAttemptDraft(ATTEMPT_IDS.student, ATTEMPT_IDS.attempt)).not.toThrow()
	})
})
