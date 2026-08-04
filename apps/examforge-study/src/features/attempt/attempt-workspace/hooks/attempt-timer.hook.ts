"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface TimerState {
	timerKey: string
	remaining: number | null
}

function normalizeRemaining(value: number | null | undefined) {
	return value == null ? null : Math.max(0, Math.ceil(value))
}

export function useAttemptTimer(
	timerKey: string,
	initialRemainingTimeSeconds: number | null | undefined,
	onZero: () => void
) {
	const initialRemaining = normalizeRemaining(initialRemainingTimeSeconds)
	const activeTimerKeyRef = useRef(timerKey)
	const deadlineRef = useRef<number | null>(null)
	const firedRef = useRef(false)
	const generationRef = useRef(0)
	const onZeroRef = useRef(onZero)

	const [timerState, setTimerState] = useState<TimerState>({
		timerKey,
		remaining: initialRemaining,
	})

	const remaining =
		timerState.timerKey === timerKey
			? timerState.remaining
			: initialRemaining

	useEffect(() => {
		onZeroRef.current = onZero
	}, [onZero])

	const recalculate = useCallback(() => {
		const activeTimerKey = activeTimerKeyRef.current
		const deadline = deadlineRef.current

		if (deadline == null) {
			setTimerState((current) => {
				if (
					current.timerKey === activeTimerKey &&
					current.remaining == null
				) {
					return current
				}

				return {
					timerKey: activeTimerKey,
					remaining: null,
				}
			})
			return
		}

		const next = Math.max(
			0,
			Math.ceil((deadline - performance.now()) / 1000)
		)

		setTimerState((current) => {
			if (
				current.timerKey === activeTimerKey &&
				current.remaining === next
			) {
				return current
			}

			return {
				timerKey: activeTimerKey,
				remaining: next,
			}
		})

		if (next === 0 && !firedRef.current) {
			firedRef.current = true
			onZeroRef.current()
		}
	}, [])

	useEffect(() => {
		const generation = ++generationRef.current

		activeTimerKeyRef.current = timerKey
		firedRef.current = false

		if (initialRemaining == null) {
			deadlineRef.current = null
			queueMicrotask(() => {
				if (generationRef.current === generation) {
					setTimerState({ timerKey, remaining: null })
				}
			})
		} else {
			deadlineRef.current =
				performance.now() + initialRemaining * 1000
			queueMicrotask(() => {
				if (generationRef.current === generation) {
					setTimerState({ timerKey, remaining: initialRemaining })
				}
			})

			if (initialRemaining === 0) {
				queueMicrotask(() => {
					if (generationRef.current === generation) {
						recalculate()
					}
				})
			}
		}

		return () => {
			if (generationRef.current === generation) {
				generationRef.current += 1
			}
		}
	}, [initialRemaining, recalculate, timerKey])

	useEffect(() => {
		if (deadlineRef.current == null) return

		const interval = window.setInterval(recalculate, 1000)

		const recalculateWhenVisible = () => {
			if (document.visibilityState === "visible") {
				recalculate()
			}
		}

		document.addEventListener(
			"visibilitychange",
			recalculateWhenVisible
		)
		window.addEventListener("focus", recalculate)

		return () => {
			window.clearInterval(interval)
			document.removeEventListener(
				"visibilitychange",
				recalculateWhenVisible
			)
			window.removeEventListener("focus", recalculate)
		}
	}, [recalculate, timerKey])

	return remaining
}

export function formatRemaining(seconds: number) {
	const normalized = Math.max(0, Math.floor(seconds))
	const hours = Math.floor(normalized / 3600)
	const minutes = Math.floor((normalized % 3600) / 60)
	const remainder = normalized % 60

	return hours > 0
		? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
		: `${minutes}:${String(remainder).padStart(2, "0")}`
}

export function usePracticeAttemptTimer(
	timerKey: string,
	persistedElapsedMs: number,
	active: boolean,
	onCheckpoint: (elapsedMs: number) => void
) {
	const [displayMs, setDisplayMs] = useState(persistedElapsedMs)
	const accumulatedRef = useRef(persistedElapsedMs)
	const segmentStartedRef = useRef<number | null>(null)
	const checkpointRef = useRef(onCheckpoint)
	useEffect(() => {
		checkpointRef.current = onCheckpoint
	}, [onCheckpoint])

	const currentElapsed = useCallback(() =>
		accumulatedRef.current + (segmentStartedRef.current == null ? 0 : performance.now() - segmentStartedRef.current), [])

	const closeSegment = useCallback(() => {
		if (segmentStartedRef.current != null) {
			accumulatedRef.current = currentElapsed()
			segmentStartedRef.current = null
		}
		setDisplayMs(accumulatedRef.current)
		checkpointRef.current(accumulatedRef.current)
	}, [currentElapsed])

	useEffect(() => {
		const canRun = () => active && document.visibilityState === "visible" && document.hasFocus()
		const updateActivity = () => {
			if (canRun()) {
				if (segmentStartedRef.current == null) segmentStartedRef.current = performance.now()
			} else {
				closeSegment()
			}
		}
		updateActivity()
		const tick = window.setInterval(() => {
			updateActivity()
			setDisplayMs(currentElapsed())
		}, 1000)
		const checkpoint = window.setInterval(() => {
			if (segmentStartedRef.current != null) checkpointRef.current(currentElapsed())
		}, 5000)
		window.addEventListener("focus", updateActivity)
		window.addEventListener("blur", updateActivity)
		document.addEventListener("visibilitychange", updateActivity)
		return () => {
			window.clearInterval(tick)
			window.clearInterval(checkpoint)
			window.removeEventListener("focus", updateActivity)
			window.removeEventListener("blur", updateActivity)
			document.removeEventListener("visibilitychange", updateActivity)
			closeSegment()
		}
	}, [active, closeSegment, currentElapsed, timerKey])

	return {
		seconds: Math.floor(displayMs / 1000),
		checkpoint: closeSegment,
	}
}