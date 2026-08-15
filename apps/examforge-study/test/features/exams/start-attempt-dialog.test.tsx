import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	useStartAttemptDialog,
	type AttemptStartContext,
} from "@/features/exams/exam-detail/hooks/use-start-attempt-dialog"
import type { CreateExamAttemptRequest } from "@/features/attempt/types/attempt.type"
import { ApiError } from "@/lib/api/api.error"
import {
	push,
	replace,
	resetNextNavigationMocks,
} from "../../support/next-navigation.mock"
import { ATTEMPT_IDS } from "../../support/attempt"

interface MutationCallbacks {
	onSuccess: (attempt: { attemptId: string }) => void
	onError: (error: unknown) => void
}

const mutation = vi.hoisted(() => ({
	isPending: false,
	mutate: vi.fn<(request: CreateExamAttemptRequest, callbacks: MutationCallbacks) => void>(),
	reset: vi.fn(),
}))

vi.mock("@/features/attempt/api/attempt.query", () => ({
	useCreateExamAttempt: () => mutation,
}))
vi.mock("next/navigation", async () => import("../../support/next-navigation.mock"))

function context(overrides: Partial<AttemptStartContext> = {}): AttemptStartContext {
	return {
		examId: ATTEMPT_IDS.exam,
		examSlug: "biology/foundations",
		examTitle: "Biology Foundations",
		examVersionId: ATTEMPT_IDS.version,
		durationMinutes: 60,
		questionCount: 20,
		sectionCount: 2,
		totalScore: 100,
		...overrides,
	}
}

describe("useStartAttemptDialog", () => {
	beforeEach(() => {
		resetNextNavigationMocks()
		mutation.isPending = false
		mutation.mutate.mockReset()
		mutation.reset.mockReset()
	})

	it("starts closed and opens Start and Retake in Practice mode every time", () => {
		const hook = renderHook(() => useStartAttemptDialog(context()))
		expect(hook.result.current.dialog).toBeNull()

		act(() => hook.result.current.openDialog("start"))
		expect(hook.result.current.dialog).toMatchObject({ mode: "start", attemptMode: "practice" })
		act(() => hook.result.current.setAttemptMode("exam"))
		expect(hook.result.current.dialog?.attemptMode).toBe("exam")
		act(() => hook.result.current.closeDialog())
		act(() => hook.result.current.openDialog("retake"))
		expect(hook.result.current.dialog).toMatchObject({ mode: "retake", attemptMode: "practice" })
		expect(mutation.reset).toHaveBeenCalledTimes(2)
	})

	it("allows Exam for timed versions and rejects it for untimed versions", () => {
		const timed = renderHook(() => useStartAttemptDialog(context()))
		act(() => timed.result.current.openDialog("start"))
		act(() => timed.result.current.setAttemptMode("exam"))
		expect(timed.result.current.dialog?.attemptMode).toBe("exam")

		const untimed = renderHook(() => useStartAttemptDialog(context({ durationMinutes: null })))
		act(() => untimed.result.current.openDialog("start"))
		act(() => untimed.result.current.setAttemptMode("exam"))
		expect(untimed.result.current.dialog?.attemptMode).toBe("practice")
	})

	it("blocks closing and duplicate confirmation while pending", () => {
		const hook = renderHook(() => useStartAttemptDialog(context()))
		act(() => hook.result.current.openDialog("start"))
		mutation.isPending = true
		hook.rerender()

		act(() => {
			hook.result.current.closeDialog()
			hook.result.current.confirmDialog()
			hook.result.current.confirmDialog()
		})

		expect(hook.result.current.dialog).not.toBeNull()
		expect(mutation.mutate).not.toHaveBeenCalled()
	})

	it("invokes onCreated and navigates to a newly created attempt", () => {
		const onCreated = vi.fn()
		mutation.mutate.mockImplementation((_request, callbacks) => callbacks.onSuccess({ attemptId: ATTEMPT_IDS.attempt }))
		const hook = renderHook(() => useStartAttemptDialog(context(), onCreated))
		act(() => hook.result.current.openDialog("start"))
		act(() => hook.result.current.confirmDialog())

		expect(mutation.mutate).toHaveBeenCalledWith({ mode: "practice" }, expect.any(Object))
		expect(onCreated).toHaveBeenCalledOnce()
		expect(push).toHaveBeenCalledWith(`/attempts/${ATTEMPT_IDS.attempt}`)
	})

	it("closes and redirects a 401 to an encoded sign-in callback", () => {
		mutation.mutate.mockImplementation((_request, callbacks) => callbacks.onError(new ApiError({
			code: "unauthorized",
			status: 401,
			message: "Unauthorized",
		})))
		const hook = renderHook(() => useStartAttemptDialog(context()))
		act(() => hook.result.current.openDialog("start"))
		act(() => hook.result.current.confirmDialog())

		expect(hook.result.current.dialog).toBeNull()
		expect(replace).toHaveBeenCalledWith(
			"/signin?callbackUrl=%2Fexams%2Fbiology%252Ffoundations"
		)
	})

	it("exposes an active existing attempt and navigates when continued", () => {
		const error = new ApiError({
			code: "conflict",
			status: 409,
			message: "Active attempt exists",
			problem: {
				code: "active_attempt_exists",
				existingAttemptId: ATTEMPT_IDS.attempt,
			},
		})
		mutation.mutate.mockImplementation((_request, callbacks) => callbacks.onError(error))
		const hook = renderHook(() => useStartAttemptDialog(context()))
		act(() => hook.result.current.openDialog("retake"))
		act(() => hook.result.current.confirmDialog())

		expect(hook.result.current.dialog).toMatchObject({
			error,
			existingAttemptId: ATTEMPT_IDS.attempt,
		})
		act(() => hook.result.current.continueExisting())
		expect(push).toHaveBeenCalledWith(`/attempts/${ATTEMPT_IDS.attempt}`)
	})

	it("keeps unknown errors available and clears prior error state when reopened", () => {
		const unknown = new Error("Unknown failure")
		mutation.mutate.mockImplementation((_request, callbacks) => callbacks.onError(unknown))
		const hook = renderHook(() => useStartAttemptDialog(context()))
		act(() => hook.result.current.openDialog("start"))
		act(() => hook.result.current.confirmDialog())
		expect(hook.result.current.dialog?.error).toBe(unknown)

		act(() => hook.result.current.openDialog("retake"))
		expect(hook.result.current.dialog).toMatchObject({
			mode: "retake",
			error: null,
			existingAttemptId: null,
		})
	})
})
