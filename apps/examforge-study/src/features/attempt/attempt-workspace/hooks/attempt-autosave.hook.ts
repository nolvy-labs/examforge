"use client"

import { useCallback, useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { ApiError } from "@/lib/api/api.error"
import { getAttempt, patchAttempt } from "../../api/attempt.api"
import { attemptQueryKeys } from "../../api/attempt.query-key"
import { getAttemptStatus, type ExamAttemptMode } from "../../types/attempt.type"
import { useAttemptActions, useAttemptChangeSequence, useAttemptDirtyCount } from "../stores/attempt.store"
import { buildPatchOperations, chunkOperations } from "../utils/attempt-patch"
import { getSyncDeadline } from "../model/attempt-sync-policy"

const RETRY_DELAYS_MS = [2_000, 5_000, 15_000]

interface Options {
	mode: ExamAttemptMode
	active: boolean
	initialRemainingTimeSeconds?: number | null
	onTerminal: () => void
}

export function useAttemptAutosave(attemptId: string, options: Options) {
	const queryClient = useQueryClient()
	const actions = useAttemptActions()
	const dirtyCount = useAttemptDirtyCount()
	const changeSequence = useAttemptChangeSequence()
	const timerRef = useRef<number | null>(null)
	const retryRef = useRef<number | null>(null)
	const queueRef = useRef(Promise.resolve(true))
	const firstDirtyAtRef = useRef<number | null>(null)
	const lastEditAtRef = useRef<number | null>(null)
	const retryCountRef = useRef(0)
	const finalThirtyTriggeredRef = useRef(false)
	const optionsRef = useRef(options)
	optionsRef.current = options

	const clearSchedule = useCallback(() => {
		if (timerRef.current) window.clearTimeout(timerRef.current)
		timerRef.current = null
	}, [])

	const runSave = useCallback(async function save(conflictRetry = true): Promise<boolean> {
		const currentOptions = optionsRef.current
		if (!currentOptions.active || actions.getAttemptId() !== attemptId) return false
		if (!actions.hasDirtyChanges()) {
			actions.setSaveState("saved")
			firstDirtyAtRef.current = null
			lastEditAtRef.current = null
			return true
		}
		if (!navigator.onLine) {
			actions.setSaveState("offline", "Answers are saved locally and waiting for a connection.")
			return false
		}

		const snapshot = actions.getSnapshot()
		const chunks = chunkOperations(buildPatchOperations(snapshot))
		if (!chunks.length) return true
		actions.setSaveState("saving")
		try {
			let { etag, revision } = actions.getConcurrency()
			let response = null
			for (const operations of chunks) {
				response = await patchAttempt(attemptId, etag, operations)
				etag = response.etag
				revision = response.data.revision
				actions.setConcurrency(etag, revision)
			}
			if (response) queryClient.setQueryData(attemptQueryKeys.detail(attemptId), response)
			actions.acknowledge(snapshot, etag, revision)
			retryCountRef.current = 0
			firstDirtyAtRef.current = actions.hasDirtyChanges() ? Date.now() : null
			lastEditAtRef.current = firstDirtyAtRef.current
			if (firstDirtyAtRef.current != null) {
				clearSchedule()
				const deadline = getSyncDeadline(
					optionsRef.current.mode,
					firstDirtyAtRef.current,
					lastEditAtRef.current!
				)
				timerRef.current = window.setTimeout(() => {
					queueRef.current = queueRef.current.then(() => save(), () => save())
				}, Math.max(0, deadline - Date.now()))
			}
			void queryClient.invalidateQueries({ queryKey: attemptQueryKeys.lists() })
			return true
		} catch (error) {
			const code = error instanceof ApiError ? error.problemCode ?? "" : ""
			if (conflictRetry && (code === "revision_mismatch" || code === "concurrency_conflict")) {
				try {
					const latest = await getAttempt(attemptId)
					queryClient.setQueryData(attemptQueryKeys.detail(attemptId), latest)
					if (getAttemptStatus(latest.data.status) !== "in-progress") {
						actions.setLocked(true)
						currentOptions.onTerminal()
						return false
					}
					actions.rebase(latest.data, latest.etag)
					return await save(false)
				} catch {
					// Preserve the local dirty generations for explicit recovery.
				}
			}
			const offline = error instanceof ApiError && error.code === "network"
			actions.setSaveState(
				offline ? "offline" : "failed",
				offline
					? "Answers are saved locally and waiting for a connection."
					: code === "revision_mismatch" || code === "concurrency_conflict"
						? "Answers are saved locally. Synchronization needs to be retried."
						: "Answers are saved locally but synchronization failed."
			)
			const conflict = code === "revision_mismatch" || code === "concurrency_conflict"
			if (!offline && !conflict && retryCountRef.current < RETRY_DELAYS_MS.length) {
				const delay = RETRY_DELAYS_MS[retryCountRef.current++]
				if (retryRef.current) window.clearTimeout(retryRef.current)
				retryRef.current = window.setTimeout(() => {
					queueRef.current = queueRef.current.then(() => runSave(), () => runSave())
				}, delay)
			}
			return false
		}
	}, [actions, attemptId, clearSchedule, queryClient])

	const enqueueSave = useCallback(() => {
		queueRef.current = queueRef.current.then(() => runSave(), () => runSave())
		return queueRef.current
	}, [runSave])

	const flush = useCallback(() => {
		clearSchedule()
		if (retryRef.current) window.clearTimeout(retryRef.current)
		retryRef.current = null
		actions.persist()
		return enqueueSave()
	}, [actions, clearSchedule, enqueueSave])

	useEffect(() => {
		clearSchedule()
		if (!options.active || dirtyCount === 0) {
			if (dirtyCount === 0) {
				firstDirtyAtRef.current = null
				lastEditAtRef.current = null
			}
			return
		}
		const now = Date.now()
		firstDirtyAtRef.current ??= now
		lastEditAtRef.current = now
		const deadline = getSyncDeadline(options.mode, firstDirtyAtRef.current, now)
		timerRef.current = window.setTimeout(() => void enqueueSave(), Math.max(0, deadline - now))
		return clearSchedule
	}, [changeSequence, clearSchedule, dirtyCount, enqueueSave, options.active, options.mode])

	useEffect(() => {
		const online = () => { if (actions.hasDirtyChanges()) void flush() }
		const hidden = () => {
			if (document.visibilityState !== "hidden") return
			actions.persist()
			if (actions.hasDirtyChanges()) void flush()
		}
		window.addEventListener("online", online)
		document.addEventListener("visibilitychange", hidden)
		return () => {
			window.removeEventListener("online", online)
			document.removeEventListener("visibilitychange", hidden)
			actions.persist()
		}
	}, [actions, flush])

	useEffect(() => {
		if (options.mode !== "exam" || options.initialRemainingTimeSeconds == null || finalThirtyTriggeredRef.current) return
		const delay = Math.max(0, (options.initialRemainingTimeSeconds - 30) * 1000)
		const timer = window.setTimeout(() => {
			if (finalThirtyTriggeredRef.current) return
			finalThirtyTriggeredRef.current = true
			if (actions.hasDirtyChanges()) void flush()
		}, delay)
		return () => window.clearTimeout(timer)
	}, [actions, flush, options.initialRemainingTimeSeconds, options.mode])

	useEffect(() => () => {
		clearSchedule()
		if (retryRef.current) window.clearTimeout(retryRef.current)
	}, [clearSchedule])

	return { flush }
}
