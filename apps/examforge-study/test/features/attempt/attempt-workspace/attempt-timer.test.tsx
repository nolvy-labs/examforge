import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
	formatRemaining,
	useAttemptTimer,
	usePracticeAttemptTimer,
} from "@/features/attempt/attempt-workspace/hooks/attempt-timer.hook"

let now = 0
let focused = true
let visibility: DocumentVisibilityState = "visible"

describe("useAttemptTimer", () => {
	beforeEach(() => {
		vi.useFakeTimers()
		now = 0
		visibility = "visible"
		vi.spyOn(performance, "now").mockImplementation(() => now)
		vi.spyOn(document, "hasFocus").mockImplementation(() => focused)
		vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility)
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("keeps null duration untimed and normalizes fractional and negative values", async () => {
		const untimed = renderHook(() => useAttemptTimer("untimed", null, vi.fn()))
		expect(untimed.result.current).toBeNull()

		const fractional = renderHook(() => useAttemptTimer("fraction", 1.2, vi.fn()))
		expect(fractional.result.current).toBe(2)

		const negative = renderHook(() => useAttemptTimer("negative", -5, vi.fn()))
		expect(negative.result.current).toBe(0)
		await act(async () => { await Promise.resolve() })
	})

	it("derives remaining time from performance.now and catches up after delayed intervals", async () => {
		const hook = renderHook(() => useAttemptTimer("exam", 10, vi.fn()))
		now = 3_500
		await act(() => vi.advanceTimersByTimeAsync(1_000))
		expect(hook.result.current).toBe(7)

		now = 9_900
		await act(() => vi.advanceTimersByTimeAsync(1_000))
		expect(hook.result.current).toBe(1)
	})

	it("fires onZero once and uses the latest callback across rerenders", async () => {
		const first = vi.fn()
		const latest = vi.fn()
		const hook = renderHook(({ callback }) => useAttemptTimer("exam", 2, callback), {
			initialProps: { callback: first },
		})
		hook.rerender({ callback: latest })
		now = 2_000
		await act(() => vi.advanceTimersByTimeAsync(2_000))
		expect(first).not.toHaveBeenCalled()
		expect(latest).toHaveBeenCalledOnce()

		now = 5_000
		await act(() => vi.advanceTimersByTimeAsync(3_000))
		hook.rerender({ callback: latest })
		expect(latest).toHaveBeenCalledOnce()
	})

	it("a new timer key resets its deadline and expiration state", async () => {
		const onZero = vi.fn()
		const hook = renderHook(({ timerKey, seconds }) => useAttemptTimer(timerKey, seconds, onZero), {
			initialProps: { timerKey: "first", seconds: 1 },
		})
		now = 1_000
		await act(() => vi.advanceTimersByTimeAsync(1_000))
		expect(onZero).toHaveBeenCalledOnce()

		now = 2_000
		hook.rerender({ timerKey: "second", seconds: 3 })
		await act(async () => { await Promise.resolve() })
		expect(hook.result.current).toBe(3)
		now = 5_000
		await act(() => vi.advanceTimersByTimeAsync(3_000))
		expect(onZero).toHaveBeenCalledTimes(2)
	})

	it("ignores stale queued microtasks from an old timer key", async () => {
		const hook = renderHook(({ timerKey, seconds }) => useAttemptTimer(timerKey, seconds, vi.fn()), {
			initialProps: { timerKey: "old", seconds: 30 as number | null },
		})
		hook.rerender({ timerKey: "new", seconds: null })

		await act(async () => { await Promise.resolve() })

		expect(hook.result.current).toBeNull()
	})

	it("recalculates immediately on focus and when becoming visible", () => {
		const hook = renderHook(() => useAttemptTimer("exam", 10, vi.fn()))
		now = 4_100
		act(() => window.dispatchEvent(new Event("focus")))
		expect(hook.result.current).toBe(6)

		now = 7_100
		visibility = "visible"
		act(() => document.dispatchEvent(new Event("visibilitychange")))
		expect(hook.result.current).toBe(3)
	})

	it("cleans up intervals and event listeners", () => {
		const clearInterval = vi.spyOn(window, "clearInterval")
		const removeDocument = vi.spyOn(document, "removeEventListener")
		const removeWindow = vi.spyOn(window, "removeEventListener")
		const hook = renderHook(() => useAttemptTimer("exam", 10, vi.fn()))

		hook.unmount()

		expect(clearInterval).toHaveBeenCalled()
		expect(removeDocument).toHaveBeenCalledWith("visibilitychange", expect.any(Function))
		expect(removeWindow).toHaveBeenCalledWith("focus", expect.any(Function))
	})
})

describe("formatRemaining", () => {
	it.each([
		[5, "0:05"],
		[65, "1:05"],
		[3_661, "1:01:01"],
		[0, "0:00"],
		[-10, "0:00"],
	] as const)("formats %i seconds as %s", (seconds, expected) => {
		expect(formatRemaining(seconds)).toBe(expected)
	})
})

describe("usePracticeAttemptTimer", () => {
	beforeEach(() => {
		vi.useFakeTimers()
		now = 0
		focused = true
		visibility = "visible"
		vi.spyOn(performance, "now").mockImplementation(() => now)
		vi.spyOn(document, "hasFocus").mockImplementation(() => focused)
		vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility)
	})

	afterEach(() => vi.useRealTimers())

	it("restores persisted elapsed time and displays whole seconds", () => {
		const hook = renderHook(() => usePracticeAttemptTimer("practice", 2_900, false, vi.fn()))
		expect(hook.result.current.seconds).toBe(2)
	})

	it("advances only while active, visible, and focused", async () => {
		const hook = renderHook(() => usePracticeAttemptTimer("practice", 1_000, true, vi.fn()))
		now = 2_500
		await act(() => vi.advanceTimersByTimeAsync(1_000))
		expect(hook.result.current.seconds).toBe(3)

		focused = false
		act(() => window.dispatchEvent(new Event("blur")))
		now = 10_000
		await act(() => vi.advanceTimersByTimeAsync(5_000))
		expect(hook.result.current.seconds).toBe(3)

		focused = true
		act(() => window.dispatchEvent(new Event("focus")))
		now = 12_000
		await act(() => vi.advanceTimersByTimeAsync(1_000))
		expect(hook.result.current.seconds).toBe(5)
	})

	it("pauses while hidden and resumes without counting hidden time", async () => {
		const hook = renderHook(() => usePracticeAttemptTimer("practice", 0, true, vi.fn()))
		now = 2_000
		visibility = "hidden"
		act(() => document.dispatchEvent(new Event("visibilitychange")))
		now = 20_000
		await act(() => vi.advanceTimersByTimeAsync(5_000))
		expect(hook.result.current.seconds).toBe(2)

		visibility = "visible"
		act(() => document.dispatchEvent(new Event("visibilitychange")))
		now = 23_000
		await act(() => vi.advanceTimersByTimeAsync(1_000))
		expect(hook.result.current.seconds).toBe(5)
	})

	it("checkpoints every five active seconds", async () => {
		const checkpoint = vi.fn()
		renderHook(() => usePracticeAttemptTimer("practice", 0, true, checkpoint))
		now = 5_000
		await act(() => vi.advanceTimersByTimeAsync(5_000))
		expect(checkpoint).toHaveBeenCalledWith(5_000)
	})

	it("manual checkpoint closes the active segment and resumes on the next activity tick", async () => {
		const checkpoint = vi.fn()
		const hook = renderHook(() => usePracticeAttemptTimer("practice", 0, true, checkpoint))
		now = 3_200
		act(() => hook.result.current.checkpoint())
		expect(checkpoint).toHaveBeenLastCalledWith(3_200)
		expect(hook.result.current.seconds).toBe(3)

		now = 4_000
		await act(() => vi.advanceTimersByTimeAsync(1_000))
		now = 6_000
		await act(() => vi.advanceTimersByTimeAsync(1_000))
		expect(hook.result.current.seconds).toBe(5)
	})

	it("checkpoints the final segment and cleans up on unmount", () => {
		const checkpoint = vi.fn()
		const clearInterval = vi.spyOn(window, "clearInterval")
		const hook = renderHook(() => usePracticeAttemptTimer("practice", 1_000, true, checkpoint))
		now = 4_000

		hook.unmount()

		expect(checkpoint).toHaveBeenLastCalledWith(5_000)
		expect(clearInterval).toHaveBeenCalledTimes(2)
	})

	it("resets elapsed state when the timer key changes", async () => {
		const checkpoint = vi.fn()
		const hook = renderHook(
			({ timerKey, persisted }) => usePracticeAttemptTimer(timerKey, persisted, true, checkpoint),
			{ initialProps: { timerKey: "first", persisted: 0 } }
		)
		now = 4_000
		await act(() => vi.advanceTimersByTimeAsync(1_000))
		hook.rerender({ timerKey: "second", persisted: 1_000 })
		await act(async () => { await Promise.resolve() })

		expect(hook.result.current.seconds).toBe(1)
	})
})
