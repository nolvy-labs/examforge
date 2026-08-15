import { describe, expect, it, vi } from "vitest"

import {
	createAttemptSubmissionGate,
	getExamAttemptAvailability,
	type ExamAttemptAvailabilityInput,
} from "@/features/exams/exam-detail/model/exam-attempt-availability"
import { ATTEMPT_IDS, buildStudentAttempt } from "../../support/attempt"
import { buildAuthUser } from "../../support/auth-user"

function input(overrides: Partial<ExamAttemptAvailabilityInput> = {}): ExamAttemptAvailabilityInput {
	return {
		authSession: { status: "authenticated", user: buildAuthUser() },
		signinHref: "/signin?callbackUrl=%2Fexams%2Fbiology",
		isActivePending: false,
		isLatestPending: false,
		isActiveError: false,
		isLatestError: false,
		failedVersionId: null,
		publishedVersionId: ATTEMPT_IDS.version,
		...overrides,
	}
}

describe("getExamAttemptAvailability", () => {
	it.each([
		["auth loading", input({ authSession: { status: "loading", user: null } }), { kind: "initializing" }],
		["guest", input({ authSession: { status: "guest", user: null } }), { kind: "sign-in", href: "/signin?callbackUrl=%2Fexams%2Fbiology" }],
		["active pending", input({ isActivePending: true }), { kind: "initializing" }],
		["active error", input({ isActiveError: true }), { kind: "error", source: "active", messageKey: "activeCheckError" }],
		["active attempt", input({ activeAttempt: buildStudentAttempt() }), { kind: "continue", href: `/attempts/${ATTEMPT_IDS.attempt}` }],
		["latest pending", input({ isLatestPending: true }), { kind: "initializing" }],
		["latest error", input({ isLatestError: true }), { kind: "error", source: "latest", messageKey: "latestCheckError" }],
		["failed published version", input({ failedVersionId: ATTEMPT_IDS.version }), { kind: "unavailable" }],
		["no previous attempt", input(), { kind: "start" }],
		["submitted latest", input({ latestAttempt: buildStudentAttempt({ status: "submitted" }) }), { kind: "result", href: `/attempts/${ATTEMPT_IDS.attempt}/result` }],
		["abandoned latest", input({ latestAttempt: buildStudentAttempt({ status: "abandoned" }) }), { kind: "retake" }],
		["unexpected in-progress latest", input({ latestAttempt: buildStudentAttempt({ status: "in-progress" }) }), { kind: "error", source: "unexpected", messageKey: "unexpectedAttemptStatus" }],
	] as const)("handles %s", (_label, state, expected) => {
		expect(getExamAttemptAvailability(state)).toEqual(expected)
	})
})

describe("createAttemptSubmissionGate", () => {
	it("accepts the first submission, blocks duplicates, and allows a submission after release", () => {
		const gate = createAttemptSubmissionGate()
		let release!: () => void
		const submit = vi.fn((nextRelease: () => void) => { release = nextRelease })

		expect(gate.run(submit)).toBe(true)
		expect(gate.run(submit)).toBe(false)
		expect(submit).toHaveBeenCalledOnce()
		release()
		expect(gate.run(submit)).toBe(true)
	})

	it("releases and rethrows a synchronous submission exception", () => {
		const gate = createAttemptSubmissionGate()
		const failure = new Error("synchronous failure")

		expect(() => gate.run(() => { throw failure })).toThrow(failure)
		expect(gate.run(() => undefined)).toBe(true)
	})
})
