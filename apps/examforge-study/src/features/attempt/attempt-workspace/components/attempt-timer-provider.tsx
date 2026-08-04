"use client"

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
} from "react"

import { useAttemptTimer } from "../hooks/attempt-timer.hook"
import { usePracticeAttemptTimer } from "../hooks/attempt-timer.hook"
import type { ExamAttemptMode } from "../../types/attempt.type"
import { useAttemptActions, useAttemptPracticeElapsed } from "../stores/attempt.store"

const AttemptTimerContext = createContext<number | null>(null)

interface AttemptTimerProviderProps {
	timerKey: string
	initialRemainingTimeSeconds: number | null | undefined
	mode: ExamAttemptMode
	practiceActive: boolean
	onExpired: () => void
	children: ReactNode
}

export function AttemptTimerProvider({
	timerKey,
	initialRemainingTimeSeconds,
	mode,
	practiceActive,
	onExpired,
	children,
}: AttemptTimerProviderProps) {
	const countdown = useAttemptTimer(
		timerKey,
		mode === "exam" ? initialRemainingTimeSeconds : null,
		onExpired
	)
	const practiceElapsed = useAttemptPracticeElapsed()
	const actions = useAttemptActions()
	const practiceTimer = usePracticeAttemptTimer(
		timerKey,
		practiceElapsed,
		mode === "practice" && practiceActive,
		actions.setPracticeElapsed
	)
	const checkpointPracticeTimer = practiceTimer.checkpoint
	useEffect(() => {
		const checkpoint = () => checkpointPracticeTimer()
		window.addEventListener("examforge:attempt-timer-checkpoint", checkpoint)
		return () => window.removeEventListener("examforge:attempt-timer-checkpoint", checkpoint)
	}, [checkpointPracticeTimer])
	const remaining = mode === "practice" ? practiceTimer.seconds : countdown

	return (
		<AttemptTimerContext.Provider value={remaining}>
			{children}
		</AttemptTimerContext.Provider>
	)
}

export function useAttemptRemainingTime() {
	return useContext(AttemptTimerContext)
}