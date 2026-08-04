"use client"

import {
	createContext,
	type ReactNode,
	useContext,
} from "react"

import { useAttemptTimer } from "../hooks/attempt-timer.hook"

const AttemptTimerContext = createContext<number | null>(null)

interface AttemptTimerProviderProps {
	timerKey: string
	initialRemainingTimeSeconds: number | null | undefined
	onExpired: () => void
	children: ReactNode
}

export function AttemptTimerProvider({
	timerKey,
	initialRemainingTimeSeconds,
	onExpired,
	children,
}: AttemptTimerProviderProps) {
	const remaining = useAttemptTimer(
		timerKey,
		initialRemainingTimeSeconds,
		onExpired
	)

	return (
		<AttemptTimerContext.Provider value={remaining}>
			{children}
		</AttemptTimerContext.Provider>
	)
}

export function useAttemptRemainingTime() {
	return useContext(AttemptTimerContext)
}