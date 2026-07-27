"use client"

import { useCallback, useEffect, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ApiError } from "@/lib/api/api.error"

import { getAttempt, patchAttempt } from "../api/attempt.api"
import { useAttemptStore } from "../stores/attempt.store"
import { getAttemptStatus } from "../types/attempt.type"
import {
	buildPatchOperations,
	chunkOperations,
} from "../utils/attempt-patch"
import { attemptKeys } from "./attempt.hook"

const DEBOUNCE_MS = 750

export function useAttemptAutosave(
	attemptId: string,
	onTerminal: () => void
) {
	const queryClient = useQueryClient()
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const queueRef = useRef(Promise.resolve(true))
	const conflictRetryRef = useRef(false)
	const dirtyCount = useAttemptStore((state) => Object.keys(state.dirty).length)
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
		const store = useAttemptStore.getState()
		if (store.attemptId !== attemptId || Object.keys(store.dirty).length === 0) {
			store.setSaveState("saved")
			return true
		}
		if (!navigator.onLine) {
			store.setSaveState("offline", "You are offline. Changes are not saved yet.")
			return false
		}

		const snapshot = store.snapshot()
		const chunks = chunkOperations(buildPatchOperations(snapshot))
		if (chunks.length === 0) return true
		store.setSaveState("saving")
		try {
			let etag = useAttemptStore.getState().etag
			let revision = useAttemptStore.getState().revision
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
				useAttemptStore.getState().setConcurrency(etag, revision)
				queryClient.setQueryData(attemptKeys.detail(attemptId), response)
			}
			useAttemptStore.getState().acknowledge(snapshot, etag, revision)
			conflictRetryRef.current = false
			if (Object.keys(useAttemptStore.getState().dirty).length > 0) {
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
					queryClient.setQueryData(attemptKeys.detail(attemptId), latest)
					if (getAttemptStatus(latest.data.status) !== "in-progress") {
						useAttemptStore.getState().setLocked(true)
						onTerminal()
						return false
					}
					useAttemptStore.getState().rebase(latest.data, latest.etag)
					return await save()
				} catch {
					// The recoverable state below keeps drafts dirty.
				}
			}
			const offline = error instanceof ApiError && error.code === "network"
			useAttemptStore.getState().setSaveState(
				offline ? "offline" : "failed",
				offline
					? "You are offline. Changes are not saved yet."
					: code === "revision_mismatch" || code === "concurrency_conflict"
						? "Another tab changed this attempt. Retry saving your answers."
						: "Some answers are not saved. Retry when your connection is stable."
			)
			return false
		}
	}, [attemptId, mutation, onTerminal, queryClient])

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
			if (Object.keys(useAttemptStore.getState().dirty).length) void flush()
		}
		window.addEventListener("online", online)
		return () => window.removeEventListener("online", online)
	}, [flush])

	useEffect(() => {
		const beforeUnload = (event: BeforeUnloadEvent) => {
			if (Object.keys(useAttemptStore.getState().dirty).length) {
				event.preventDefault()
			}
		}
		window.addEventListener("beforeunload", beforeUnload)
		return () => window.removeEventListener("beforeunload", beforeUnload)
	}, [])

	return { flush, isSaving: mutation.isPending }
}
