"use client"

import { useEffect, useRef } from "react"

import { useExamBuilderSaveAll } from "../save/exam-builder-save"
import {
	useBuilderActions,
	useBuilderSaveStatus,
	useBuilderValidation,
} from "../store/exam-builder.store"

export interface AutosaveClock {
	now: () => number
	setTimer: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
	clearTimer: (timer: ReturnType<typeof setTimeout>) => void
}

const defaultClock: AutosaveClock = {
	now: () => Date.now(),
	setTimer: (callback, delay) => setTimeout(callback, delay),
	clearTimer: (timer) => clearTimeout(timer),
}

export function autosaveDelay(now: number, deadline: number) {
	return Math.max(0, deadline - now)
}

export function useExamBuilderAutosave(clock: AutosaveClock = defaultClock) {
	const saveAll = useExamBuilderSaveAll(clock.now)
	const actions = useBuilderActions()
	const save = useBuilderSaveStatus()
	const validation = useBuilderValidation()
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		if (timerRef.current) clock.clearTimer(timerRef.current)
		timerRef.current = null
		const deadline = save.autosaveDeadline
		const eligible =
			save.dirty &&
			save.status === "unsaved" &&
			!save.isSaving &&
			!save.conflict &&
			!save.reconciliation &&
			validation.save.length === 0 &&
			deadline !== null &&
			save.lastAutosaveAttemptedDeadline !== deadline
		if (!eligible || deadline === null) return
		timerRef.current = clock.setTimer(() => {
			timerRef.current = null
			actions.markAutosaveAttempt(deadline)
			void saveAll("auto")
		}, autosaveDelay(clock.now(), deadline))
		return () => {
			if (timerRef.current) clock.clearTimer(timerRef.current)
			timerRef.current = null
		}
	}, [actions, clock, save, saveAll, validation.save.length])
}
