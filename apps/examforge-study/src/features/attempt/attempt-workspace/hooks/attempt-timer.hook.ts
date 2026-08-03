"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export function useAttemptTimer(
	remainingTimeSeconds: number | null | undefined,
	onZero: () => void
) {
	const deadlineRef = useRef<number | null>(null)
	const firedRef = useRef(false)
	const [timerState, setTimerState] = useState({
		sourceSeconds: remainingTimeSeconds,
		remaining: remainingTimeSeconds ?? null,
	})
	const remaining =
		timerState.sourceSeconds === remainingTimeSeconds
			? timerState.remaining
			: (remainingTimeSeconds ?? null)

	const recalculate = useCallback(() => {
		if (deadlineRef.current == null) {
			setTimerState({
				sourceSeconds: remainingTimeSeconds,
				remaining: null,
			})
			return
		}
		const next = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
		setTimerState({
			sourceSeconds: remainingTimeSeconds,
			remaining: next,
		})
		if (next === 0 && !firedRef.current) {
			firedRef.current = true
			onZero()
		}
	}, [onZero, remainingTimeSeconds])

	useEffect(() => {
		if (remainingTimeSeconds == null) {
			deadlineRef.current = null
			return
		}
		deadlineRef.current = Date.now() + remainingTimeSeconds * 1000
		firedRef.current = false
		if (remainingTimeSeconds <= 0) {
			queueMicrotask(recalculate)
		}
	}, [recalculate, remainingTimeSeconds])

	useEffect(() => {
		if (deadlineRef.current == null) return
		const interval = window.setInterval(recalculate, 1000)
		const visible = () => {
			if (document.visibilityState === "visible") recalculate()
		}
		document.addEventListener("visibilitychange", visible)
		return () => {
			window.clearInterval(interval)
			document.removeEventListener("visibilitychange", visible)
		}
	}, [recalculate])

	return remaining
}

export function formatRemaining(seconds: number) {
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const remainder = seconds % 60
	return hours > 0
		? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
		: `${minutes}:${String(remainder).padStart(2, "0")}`
}
