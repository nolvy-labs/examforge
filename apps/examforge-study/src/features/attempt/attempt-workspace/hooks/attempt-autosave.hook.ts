"use client"

import { useCallback, useEffect, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ApiError } from "@/lib/api/api.error"

import { getAttempt, patchAttempt } from "../../api/attempt.api"
import { attemptQueryKeys } from "../../api/attempt.query-key"
import {
	useAttemptActions,
	useAttemptDirtyCount,
} from "../stores/attempt.store"
import { getAttemptStatus } from "../../types/attempt.type"
import {
	buildPatchOperations,
	chunkOperations,
} from "../utils/attempt-patch"

const DEBOUNCE_MS = 750

export function useAttemptAutosave(
	attemptId: string,
	onTerminal: () => void
) {
	const queryClient = useQueryClient()
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const queueRef = useRef(Promise.resolve(true))
	const conflictRetryRef = useRef(false)
	const dirtyCount = useAttemptDirtyCount()
	const actions = useAttemptActions()
	const mutation = useMutation({
		mutationFn: ({
			etag,
			operations,
		}: {
			etag: string
			operations: ReturnType<typeof buildPatchOperations>
		}) => patchAttempt(attemptId, etag, operations),
	})

	const runSave = useCallback(async function save(): Promise<boolean> {
		if (
			actions.getAttemptId() !== attemptId ||
			!actions.hasDirtyChanges()
		) {
			actions.setSaveState("saved")
			return true
		}
		if (!navigator.onLine) {
			actions.setSaveState(
				"offline",
				"You are offline. Changes are not saved yet."
			)
			return false
		}

		const snapshot = actions.getSnapshot()
		const chunks = chunkOperations(buildPatchOperations(snapshot))
		if (chunks.length === 0) return true
		actions.setSaveState("saving")
		try {
			let { etag, revision } = actions.getConcurrency()
			for (const operations of chunks) {
				let response
				for (let attempt = 0; ; attempt++) {
					try {
						response = await mutation.mutateAsync({ etag, operations })
						break
					} catch (error) {
						const temporary =
							error instanceof ApiError &&
							(error.code === "network" || error.code === "timeout" || error.code === "server")
						if (!temporary || attempt >= 1) throw error
						await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
					}
				}
				etag = response.etag
				revision = response.data.revision
				actions.setConcurrency(etag, revision)
				queryClient.setQueryData(
					attemptQueryKeys.detail(attemptId),
					response
				)
			}
			actions.acknowledge(snapshot, etag, revision)
			void queryClient.invalidateQueries({
				queryKey: attemptQueryKeys.lists(),
			})
			conflictRetryRef.current = false
			if (actions.hasDirtyChanges()) {
				timerRef.current = setTimeout(() => {
					queueRef.current = queueRef.current.then(save, save)
				}, DEBOUNCE_MS)
			}
			return true
		} catch (error) {
			const code = error instanceof ApiError ? error.problemCode ?? "" : ""
			if (
				(code === "revision_mismatch" || code === "concurrency_conflict") &&
				!conflictRetryRef.current
			) {
				conflictRetryRef.current = true
				try {
					const latest = await getAttempt(attemptId)
					queryClient.setQueryData(
						attemptQueryKeys.detail(attemptId),
						latest
					)
					if (getAttemptStatus(latest.data.status) !== "in-progress") {
						actions.setLocked(true)
						onTerminal()
						return false
					}
					actions.rebase(latest.data, latest.etag)
					return await save()
				} catch {
					// The recoverable state below keeps drafts dirty.
				}
			}
			const offline = error instanceof ApiError && error.code === "network"
			actions.setSaveState(
				offline ? "offline" : "failed",
				offline
					? "You are offline. Changes are not saved yet."
					: code === "revision_mismatch" || code === "concurrency_conflict"
						? "Another tab changed this attempt. Retry saving your answers."
						: "Some answers are not saved. Retry when your connection is stable."
			)
			return false
		}
	}, [actions, attemptId, mutation, onTerminal, queryClient])

	const enqueueSave = useCallback(() => {
		queueRef.current = queueRef.current.then(runSave, runSave)
		return queueRef.current
	}, [runSave])

	const flush = useCallback(() => {
		if (timerRef.current) clearTimeout(timerRef.current)
		timerRef.current = null
		return enqueueSave()
	}, [enqueueSave])

	useEffect(() => {
		if (dirtyCount === 0) return
		if (timerRef.current) clearTimeout(timerRef.current)
		timerRef.current = setTimeout(() => void enqueueSave(), DEBOUNCE_MS)
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current)
		}
	}, [dirtyCount, enqueueSave])

	useEffect(() => {
		const online = () => {
			if (actions.hasDirtyChanges()) void flush()
		}
		window.addEventListener("online", online)
		return () => window.removeEventListener("online", online)
	}, [actions, flush])

	useEffect(() => {
		const beforeUnload = (event: BeforeUnloadEvent) => {
			if (actions.hasDirtyChanges()) {
				event.preventDefault()
			}
		}
		window.addEventListener("beforeunload", beforeUnload)
		return () => window.removeEventListener("beforeunload", beforeUnload)
	}, [actions])

	return { flush, isSaving: mutation.isPending }
}
