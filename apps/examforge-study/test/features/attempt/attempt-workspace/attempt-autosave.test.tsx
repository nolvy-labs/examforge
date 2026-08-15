import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/api.error"
import { useAttemptAutosave } from "@/features/attempt/attempt-workspace/hooks/attempt-autosave.hook"
import {
	useAttemptActions,
	useAttemptDirtyCount,
	useAttemptLocked,
	useAttemptSaveStatus,
} from "@/features/attempt/attempt-workspace/stores/attempt.store"
import { attemptQueryKeys } from "@/features/attempt/api/attempt.query-key"
import {
	ATTEMPT_IDS,
	buildAttemptDetail,
	buildAttemptResponse,
	buildAttemptSection,
	buildFillBlankQuestion,
} from "../../../support/attempt"
import {
	createTestQueryClient,
	createTestWrapper,
} from "../../../support/render"

const api = vi.hoisted(() => ({
	patchAttempt: vi.fn(),
	getAttempt: vi.fn(),
}))

vi.mock("@/features/attempt/api/attempt.api", () => api)

function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (reason: unknown) => void
	const promise = new Promise<T>((done, fail) => {
		resolve = done
		reject = fail
	})
	return { promise, resolve, reject }
}

function useStoreView() {
	return {
		actions: useAttemptActions(),
		dirtyCount: useAttemptDirtyCount(),
		locked: useAttemptLocked(),
		save: useAttemptSaveStatus(),
	}
}

function initialize(mode: "practice" | "exam" = "practice", detail = buildAttemptDetail({ mode })) {
	const store = renderHook(() => useStoreView())
	act(() => store.result.current.actions.reset())
	act(() => store.result.current.actions.initialize(detail, '"3"', ATTEMPT_IDS.student, null))
	return store
}

function renderAutosave({
	mode = "practice",
	active = true,
	remaining = null,
	onTerminal = vi.fn(),
	queryClient = createTestQueryClient(),
}: {
	mode?: "practice" | "exam"
	active?: boolean
	remaining?: number | null
	onTerminal?: () => void
	queryClient?: ReturnType<typeof createTestQueryClient>
} = {}) {
	return {
		queryClient,
		...renderHook(() => useAttemptAutosave(ATTEMPT_IDS.attempt, {
			mode,
			active,
			initialRemainingTimeSeconds: remaining,
			onTerminal,
		}), { wrapper: createTestWrapper({ queryClient }) }),
	}
}

describe("useAttemptAutosave", () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-08-13T00:00:00.000Z"))
		vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible")
		api.patchAttempt.mockReset()
		api.getAttempt.mockReset()
		api.patchAttempt.mockResolvedValue(buildAttemptResponse({
			data: buildAttemptDetail({ revision: 4 }),
			etag: '"4"',
		}))
		localStorage.clear()
	})

	afterEach(() => {
		const store = renderHook(() => useAttemptActions())
		act(() => store.result.current.reset())
		vi.useRealTimers()
	})

	it("saves Practice at the first-dirty two-minute deadline without postponing for later edits", async () => {
		const store = initialize("practice")
		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "first"))
		renderAutosave({ mode: "practice" })

		await act(() => vi.advanceTimersByTimeAsync(60_000))
		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "later"))
		await act(() => vi.advanceTimersByTimeAsync(59_999))
		expect(api.patchAttempt).not.toHaveBeenCalled()
		await act(() => vi.advanceTimersByTimeAsync(1))
		expect(api.patchAttempt).toHaveBeenCalledOnce()
	})

	it("saves Exam ten seconds after the latest edit", async () => {
		const store = initialize("exam")
		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "first"))
		renderAutosave({ mode: "exam" })
		await act(() => vi.advanceTimersByTimeAsync(5_000))
		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "later"))
		await act(() => vi.advanceTimersByTimeAsync(9_999))
		expect(api.patchAttempt).not.toHaveBeenCalled()
		await act(() => vi.advanceTimersByTimeAsync(1))
		expect(api.patchAttempt).toHaveBeenCalledOnce()
	})

	it("caps continuous Exam edits at sixty seconds", async () => {
		const store = initialize("exam")
		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "0"))
		renderAutosave({ mode: "exam" })
		for (let second = 9; second <= 54; second += 9) {
			await act(() => vi.advanceTimersByTimeAsync(9_000))
			act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, String(second)))
		}
		await act(() => vi.advanceTimersByTimeAsync(5_999))
		expect(api.patchAttempt).not.toHaveBeenCalled()
		await act(() => vi.advanceTimersByTimeAsync(1))
		expect(api.patchAttempt).toHaveBeenCalledOnce()
	})

	it("does not schedule while inactive or clean and cancels work on cleanup", async () => {
		initialize("practice")
		const clean = renderAutosave({ mode: "practice" })
		await act(() => vi.advanceTimersByTimeAsync(120_000))
		expect(api.patchAttempt).not.toHaveBeenCalled()
		clean.unmount()

		const store = initialize("practice")
		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "dirty"))
		const inactive = renderAutosave({ mode: "practice", active: false })
		await act(() => vi.advanceTimersByTimeAsync(120_000))
		expect(api.patchAttempt).not.toHaveBeenCalled()
		inactive.unmount()

		const active = renderAutosave({ mode: "practice" })
		active.unmount()
		await act(() => vi.advanceTimersByTimeAsync(120_000))
		expect(api.patchAttempt).not.toHaveBeenCalled()
	})

	it("persists before explicit flush, transitions saving state, patches the dirty snapshot, caches and invalidates", async () => {
		const response = buildAttemptResponse({
			data: buildAttemptDetail({ revision: 4 }),
			etag: '"4"',
		})
		const request = deferred<ReturnType<typeof buildAttemptResponse>>()
		api.patchAttempt.mockReturnValueOnce(request.promise)
		const store = initialize("practice")
		const setItem = vi.spyOn(Storage.prototype, "setItem")
		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "new answer"))
		const queryClient = createTestQueryClient()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")
		const hook = renderAutosave({ queryClient })
		expect(store.result.current.save.saveState).toBe("waiting")

		let save!: Promise<boolean>
		act(() => { save = hook.result.current.flush() })
		expect(setItem).toHaveBeenCalled()
		await act(async () => { await Promise.resolve() })
		expect(store.result.current.save.saveState).toBe("saving")
		request.resolve(response)
		await act(() => save)

		expect(api.patchAttempt).toHaveBeenCalledWith(ATTEMPT_IDS.attempt, '"3"', [{
			op: "replace",
			path: `/answers/${ATTEMPT_IDS.fill}/textAnswer`,
			value: "new answer",
		}])
		expect(store.result.current.save.saveState).toBe("saved")
		expect(store.result.current.dirtyCount).toBe(0)
		expect(queryClient.getQueryData(attemptQueryKeys.detail(ATTEMPT_IDS.attempt))).toEqual(response)
		expect(invalidate).toHaveBeenCalledWith({ queryKey: attemptQueryKeys.lists() })
	})

	it("sends more than 100 operations sequentially and chains each ETag", async () => {
		const questions = Array.from({ length: 101 }, (_, index) => buildFillBlankQuestion({
			id: `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
			displayOrder: index,
			answer: { textAnswer: null, selectedOptionIds: [] },
		}))
		const detail = buildAttemptDetail({ sections: [buildAttemptSection({ questions })] })
		const store = initialize("practice", detail)
		for (const question of questions) {
			act(() => store.result.current.actions.setText(question.id, question.id))
		}
		api.patchAttempt
			.mockResolvedValueOnce(buildAttemptResponse({ data: buildAttemptDetail({ revision: 4 }), etag: '"4"' }))
			.mockResolvedValueOnce(buildAttemptResponse({ data: buildAttemptDetail({ revision: 5 }), etag: '"5"' }))
		const hook = renderAutosave()

		await act(() => hook.result.current.flush())

		expect(api.patchAttempt).toHaveBeenCalledTimes(2)
		expect(api.patchAttempt.mock.calls[0]?.[1]).toBe('"3"')
		expect(api.patchAttempt.mock.calls[0]?.[2]).toHaveLength(100)
		expect(api.patchAttempt.mock.calls[1]?.[1]).toBe('"4"')
		expect(api.patchAttempt.mock.calls[1]?.[2]).toHaveLength(1)
	})

	it("serializes overlapping flushes and leaves a newer in-flight edit dirty", async () => {
		const first = deferred<ReturnType<typeof buildAttemptResponse>>()
		api.patchAttempt.mockReturnValueOnce(first.promise).mockResolvedValue(buildAttemptResponse({
			data: buildAttemptDetail({ revision: 5 }),
			etag: '"5"',
		}))
		const store = initialize("practice")
		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "sent"))
		const hook = renderAutosave()
		let firstFlush!: Promise<boolean>
		act(() => { firstFlush = hook.result.current.flush() })
		await act(async () => { await Promise.resolve() })
		expect(api.patchAttempt).toHaveBeenCalledOnce()

		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "newer"))
		let secondFlush!: Promise<boolean>
		act(() => { secondFlush = hook.result.current.flush() })
		expect(api.patchAttempt).toHaveBeenCalledOnce()
		first.resolve(buildAttemptResponse({ data: buildAttemptDetail({ revision: 4 }), etag: '"4"' }))
		await act(() => firstFlush)
		await act(() => secondFlush)

		expect(api.patchAttempt).toHaveBeenCalledTimes(2)
		expect(api.patchAttempt.mock.calls[1]?.[1]).toBe('"4"')
		expect(store.result.current.dirtyCount).toBe(0)
	})

	it("keeps dirty answers local offline and flushes on the online event", async () => {
		vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
		const store = initialize("practice")
		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "offline"))
		const hook = renderAutosave()

		await act(() => hook.result.current.flush())
		expect(api.patchAttempt).not.toHaveBeenCalled()
		expect(store.result.current.dirtyCount).toBe(1)
		expect(store.result.current.save).toEqual({
			saveState: "offline",
			saveMessage: "Answers are saved locally and waiting for a connection.",
		})

		vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
		await act(async () => {
			window.dispatchEvent(new Event("online"))
			await Promise.resolve()
		})
		await act(async () => { await Promise.resolve() })
		expect(api.patchAttempt).toHaveBeenCalledOnce()
	})

	it("persists and flushes when the document becomes hidden", async () => {
		const store = initialize("practice")
		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "hidden"))
		const setItem = vi.spyOn(Storage.prototype, "setItem")
		renderAutosave()
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")

		await act(async () => {
			document.dispatchEvent(new Event("visibilitychange"))
			await Promise.resolve()
		})
		await act(async () => { await Promise.resolve() })
		expect(setItem).toHaveBeenCalled()
		expect(api.patchAttempt).toHaveBeenCalledOnce()
	})

	it("preserves dirty generations, labels failures, and retries at exactly 2, 5, and 15 seconds", async () => {
		api.patchAttempt
			.mockRejectedValueOnce(new Error("first"))
			.mockRejectedValueOnce(new Error("second"))
			.mockRejectedValueOnce(new Error("third"))
			.mockResolvedValueOnce(buildAttemptResponse({ data: buildAttemptDetail({ revision: 4 }), etag: '"4"' }))
		const store = initialize("practice")
		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "retry"))
		const hook = renderAutosave()
		await act(() => hook.result.current.flush())
		expect(store.result.current.save.saveState).toBe("failed")
		expect(store.result.current.dirtyCount).toBe(1)

		await act(() => vi.advanceTimersByTimeAsync(1_999))
		expect(api.patchAttempt).toHaveBeenCalledTimes(1)
		await act(() => vi.advanceTimersByTimeAsync(1))
		expect(api.patchAttempt).toHaveBeenCalledTimes(2)
		await act(() => vi.advanceTimersByTimeAsync(4_999))
		expect(api.patchAttempt).toHaveBeenCalledTimes(2)
		await act(() => vi.advanceTimersByTimeAsync(1))
		expect(api.patchAttempt).toHaveBeenCalledTimes(3)
		await act(() => vi.advanceTimersByTimeAsync(14_999))
		expect(api.patchAttempt).toHaveBeenCalledTimes(3)
		await act(() => vi.advanceTimersByTimeAsync(1))
		expect(api.patchAttempt).toHaveBeenCalledTimes(4)
		expect(store.result.current.save.saveState).toBe("saved")
		expect(store.result.current.dirtyCount).toBe(0)

		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "after reset"))
		api.patchAttempt
			.mockRejectedValueOnce(new Error("new failure"))
			.mockResolvedValueOnce(buildAttemptResponse({ data: buildAttemptDetail({ revision: 5 }), etag: '"5"' }))
		await act(() => hook.result.current.flush())
		await act(() => vi.advanceTimersByTimeAsync(1_999))
		expect(api.patchAttempt).toHaveBeenCalledTimes(5)
		await act(() => vi.advanceTimersByTimeAsync(1))
		expect(api.patchAttempt).toHaveBeenCalledTimes(6)
	})

	it("uses offline messaging for network errors and failed messaging for other errors", async () => {
		const store = initialize("practice")
		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "network"))
		api.patchAttempt.mockRejectedValue(new ApiError({ code: "network", message: "Offline" }))
		const hook = renderAutosave()
		await act(() => hook.result.current.flush())
		expect(store.result.current.save.saveState).toBe("offline")
		expect(store.result.current.save.saveMessage).toContain("waiting for a connection")

		api.patchAttempt.mockRejectedValue(new Error("server"))
		await act(() => hook.result.current.flush())
		expect(store.result.current.save.saveState).toBe("failed")
		expect(store.result.current.save.saveMessage).toContain("synchronization failed")
	})

	it.each(["revision_mismatch", "concurrency_conflict"])(
		"rebases and retries one %s conflict with the latest ETag",
		async (problemCode) => {
			api.patchAttempt
				.mockRejectedValueOnce(new ApiError({
					code: "conflict",
					message: "Conflict",
					problem: { code: problemCode },
				}))
				.mockResolvedValueOnce(buildAttemptResponse({ data: buildAttemptDetail({ revision: 9 }), etag: '"9"' }))
			api.getAttempt.mockResolvedValue(buildAttemptResponse({
				data: buildAttemptDetail({ revision: 8 }),
				etag: '"8"',
			}))
			const store = initialize("practice")
			act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "local"))
			const hook = renderAutosave()

			await act(() => hook.result.current.flush())

			expect(api.getAttempt).toHaveBeenCalledWith(ATTEMPT_IDS.attempt)
			expect(api.patchAttempt).toHaveBeenCalledTimes(2)
			expect(api.patchAttempt.mock.calls[1]?.[1]).toBe('"8"')
			expect(store.result.current.dirtyCount).toBe(0)
		}
	)

	it("does not retry a repeated conflict indefinitely", async () => {
		const conflict = new ApiError({ code: "conflict", message: "Conflict", problem: { code: "revision_mismatch" } })
		api.patchAttempt.mockRejectedValue(conflict)
		api.getAttempt.mockResolvedValue(buildAttemptResponse({ data: buildAttemptDetail({ revision: 8 }), etag: '"8"' }))
		const store = initialize("practice")
		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "local"))
		const hook = renderAutosave()

		await act(() => hook.result.current.flush())

		expect(api.patchAttempt).toHaveBeenCalledTimes(2)
		expect(api.getAttempt).toHaveBeenCalledOnce()
		expect(store.result.current.dirtyCount).toBe(1)
	})

	it("locks and invokes onTerminal when conflict recovery finds a terminal attempt", async () => {
		const onTerminal = vi.fn()
		api.patchAttempt.mockRejectedValue(new ApiError({
			code: "conflict",
			message: "Conflict",
			problem: { code: "revision_mismatch" },
		}))
		api.getAttempt.mockResolvedValue(buildAttemptResponse({
			data: buildAttemptDetail({ status: "submitted", revision: 8 }),
			etag: '"8"',
		}))
		const store = initialize("practice")
		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "local"))
		const hook = renderAutosave({ onTerminal })

		await act(() => hook.result.current.flush())

		expect(onTerminal).toHaveBeenCalledOnce()
		expect(store.result.current.locked).toBe(true)
		expect(store.result.current.actions.hasDirtyChanges()).toBe(true)
	})

	it("keeps local changes when conflict recovery itself fails", async () => {
		api.patchAttempt.mockRejectedValue(new ApiError({
			code: "conflict",
			message: "Conflict",
			problem: { code: "concurrency_conflict" },
		}))
		api.getAttempt.mockRejectedValue(new Error("recovery failed"))
		const store = initialize("practice")
		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "local"))
		const hook = renderAutosave()

		await act(() => hook.result.current.flush())

		expect(store.result.current.dirtyCount).toBe(1)
		expect(store.result.current.save.saveMessage).toContain("Synchronization needs to be retried")
	})

	it("flushes a dirty Exam once on entering the final thirty seconds", async () => {
		const store = initialize("exam")
		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "final"))
		renderAutosave({ mode: "exam", remaining: 35 })

		await act(() => vi.advanceTimersByTimeAsync(5_000))
		expect(api.patchAttempt).toHaveBeenCalledOnce()
		await act(() => vi.advanceTimersByTimeAsync(30_000))
		expect(api.patchAttempt).toHaveBeenCalledOnce()
	})

	it.each([
		["Practice", "practice" as const, 35],
		["untimed Exam", "exam" as const, null],
	])("does not apply the final-thirty behavior to %s", async (_label, mode, remaining) => {
		const store = initialize(mode)
		act(() => store.result.current.actions.setText(ATTEMPT_IDS.fill, "dirty"))
		renderAutosave({ mode, remaining })
		await act(() => vi.advanceTimersByTimeAsync(5_000))
		expect(api.patchAttempt).not.toHaveBeenCalled()
	})
})
