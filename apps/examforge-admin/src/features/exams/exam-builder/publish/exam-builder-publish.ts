"use client"

import { useCallback, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ApiError } from "@/lib/api/api.error"

import {
	getAdminExamVersion,
	getCompleteAdminExamVersion,
	publishAdminExamVersion,
} from "../api/exam-builder.api"
import { examBuilderQueryKeys } from "../api/exam-builder.query-key"
import { invalidatePublishedExamViews } from "../api/exam-builder.query"
import { diffBuilderDocuments } from "../model/builder-diff"
import { mapFullVersionToBuilderDocument } from "../model/builder-mapper"
import { useExamBuilderSaveAll } from "../save/exam-builder-save"
import { useBuilderActions } from "../store/exam-builder.store"

export type PublishBuilderResult =
	| { status: "success" }
	| { status: "validation-error" }
	| { status: "save-failed" }
	| { status: "blocked" }
	| { status: "failed"; error: unknown }

export function usePublishExamBuilder(now: () => number = Date.now) {
	const actions = useBuilderActions()
	const saveAll = useExamBuilderSaveAll(now)
	const queryClient = useQueryClient()
	const runningRef = useRef<Promise<PublishBuilderResult> | null>(null)
	const mutation = useMutation({
		mutationKey: ["admin-exam-builder", "publish"],
		mutationFn: publishAdminExamVersion,
	})

	return useCallback(() => {
		if (runningRef.current) return runningRef.current
		const run = async (): Promise<PublishBuilderResult> => {
			const initial = actions.getSaveContext()
			if (!initial || initial.working.version.status !== "draft") return { status: "blocked" }
			const initialErrors = actions
				.validate("publish")
				.filter((error) => error.code !== "total_score_mismatch")
			if (initialErrors.length > 0) return { status: "validation-error" }
			const initialDiff = diffBuilderDocuments(initial.confirmed, initial.working)
			if (initialDiff.operations.length > 0 || initialDiff.issues.length > 0) {
				const save = await saveAll("publish")
				if (save.status !== "success" && save.status !== "noop") return { status: "save-failed" }
			}
			const current = actions.getSaveContext()
			if (!current || current.working.version.status !== "draft") return { status: "blocked" }
			const remaining = diffBuilderDocuments(current.confirmed, current.working)
			if (remaining.operations.length > 0 || remaining.issues.length > 0) return { status: "save-failed" }
			if (actions.validate("publish").length > 0) return { status: "validation-error" }
			if (!actions.beginPublish()) return { status: "blocked" }

			try {
				const remote = await getAdminExamVersion(current.identity)
				if (remote.data.status !== 0) {
					throw new ApiError({
						code: "conflict",
						status: 409,
						message: "The server no longer considers this version a Draft.",
						context: "publish admin exam version",
					})
				}
				await mutation.mutateAsync(current.identity)
				const canonicalResponse = await getCompleteAdminExamVersion(current.identity)
				const canonical = mapFullVersionToBuilderDocument(canonicalResponse.data, {
					etag: canonicalResponse.etag,
					examArchived: current.working.examArchived,
				})
				queryClient.setQueryData(
					examBuilderQueryKeys.version(
						current.identity.examId,
						current.identity.versionId
					),
					canonicalResponse
				)
				actions.forceReload(canonical, now())
				await invalidatePublishedExamViews(
					queryClient,
					current.identity.examId
				)
				actions.finishPublish(true)
				return { status: "success" }
			} catch (error) {
				actions.finishPublish(false)
				return { status: "failed", error }
			}
		}
		runningRef.current = run().finally(() => {
			runningRef.current = null
		})
		return runningRef.current
	}, [actions, mutation, now, queryClient, saveAll])
}
