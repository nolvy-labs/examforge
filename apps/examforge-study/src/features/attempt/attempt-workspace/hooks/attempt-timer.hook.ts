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
	const sourceRef = useRef({
		timerKey,
		initialRemaining,
	})
	const activeTimerKeyRef = useRef(timerKey)
	const deadlineRef = useRef<number | null>(null)
	const firedRef = useRef(false)
	const generationRef = useRef(0)
	const onZeroRef = useRef(onZero)

	if (sourceRef.current.timerKey !== timerKey) {
		sourceRef.current = {
			timerKey,
			initialRemaining,
		}
	}

	const [timerState, setTimerState] = useState<TimerState>({
		timerKey,
		remaining: initialRemaining,
	})

	const remaining =
		timerState.timerKey === timerKey
			? timerState.remaining
			: sourceRef.current.initialRemaining

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
		const source = sourceRef.current
		const generation = ++generationRef.current

		activeTimerKeyRef.current = timerKey
		firedRef.current = false

		if (source.initialRemaining == null) {
			deadlineRef.current = null
			setTimerState({
				timerKey,
				remaining: null,
			})
		} else {
			deadlineRef.current =
				performance.now() + source.initialRemaining * 1000
			setTimerState({
				timerKey,
				remaining: source.initialRemaining,
			})

			if (source.initialRemaining === 0) {
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
	}, [recalculate, timerKey])

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