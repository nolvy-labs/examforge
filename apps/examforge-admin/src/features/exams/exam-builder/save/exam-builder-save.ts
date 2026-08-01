"use client"

import { useCallback, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { ApiError } from "@/lib/api/api.error"

import type {
	BulkUpdateExamVersionContentRequest,
	PatchOperation,
} from "../../types/exam-version.types"
import {
	batchUpdateAdminExamVersionContent,
	createAdminExamSection,
	createAdminFillAnswerKey,
	createAdminQuestion,
	createAdminQuestionOption,
	deleteAdminExamSection,
	deleteAdminFillAnswerKey,
	deleteAdminQuestion,
	deleteAdminQuestionOption,
	getAdminExamVersion,
	getCompleteAdminExamVersion,
	reorderAdminExamSections,
	reorderAdminQuestions,
	reorderAdminQuestionOptions,
	type VersionContentScope,
} from "../api/exam-builder.api"
import { examBuilderQueryKeys } from "../api/exam-builder.query-key"
import { invalidateVersionControlQueries } from "../api/exam-builder.query"
import { diffBuilderDocuments } from "../model/builder-diff"
import { cloneBuilderDocument } from "../model/builder-derived"
import {
	getServerId,
	isPersistedEntityId,
	toPersistedEntityId,
} from "../model/builder-id"
import {
	builderAnswerKeyToCreateRequest,
	builderOptionToCreateRequest,
	builderQuestionOrderRequest,
	builderQuestionToCreateRequest,
	builderSectionOrderRequest,
	builderSectionToCreateRequest,
	builderOptionOrderRequest,
	mapCreatedQuestionIds,
	mapCreatedSectionIds,
	mapFullVersionToBuilderDocument,
	replaceTemporaryIds,
} from "../model/builder-mapper"
import type {
	BuilderCreateOperation,
	BuilderDeleteOperation,
	BuilderDiffOperation,
	BuilderDocument,
	BuilderEntityId,
	BuilderReorderOperation,
	PersistedEntityId,
} from "../model/builder.types"
import {
	useBuilderActions,
	type BuilderSaveContext,
} from "../store/exam-builder.store"

export type SaveAllTrigger = "manual" | "auto" | "publish"

export type SaveAllResult =
	| { status: "success"; dirtyAfterSave: boolean }
	| { status: "noop" }
	| { status: "validation-error" }
	| { status: "blocked" }
	| { status: "conflict" }
	| { status: "reconciliation-required" }
	| { status: "failed"; error: unknown }

export interface SaveExecutionStep {
	id: string
	kind: "delete" | "batch" | "create" | "reorder"
	operationIds: string[]
	dependsOn: string[]
}

class UnexpectedRevisionAdvanceError extends Error {}
class CreatedIdentityMappingError extends Error {}

function asPersisted(id: BuilderEntityId) {
	const serverId = getServerId(id)
	if (!serverId) throw new CreatedIdentityMappingError("A server ID is not resolved.")
	return serverId
}

function deleteRank(operation: BuilderDeleteOperation) {
	return operation.entity === "option" || operation.entity === "answer-key"
		? 0
		: operation.entity === "question"
			? 1
			: 2
}

export function buildSaveExecutionPlan(
	operations: BuilderDiffOperation[]
): SaveExecutionStep[] {
	const deletes = operations
		.filter((operation): operation is BuilderDeleteOperation => operation.kind === "delete")
		.sort((left, right) => deleteRank(left) - deleteRank(right) || left.id.localeCompare(right.id))
	const batchIds = operations
		.filter((operation) => operation.kind === "update" || operation.kind === "relationship")
		.map((operation) => operation.id)
		.sort()
	const creates = operations
		.filter((operation): operation is BuilderCreateOperation => operation.kind === "create")
		.sort((left, right) => left.id.localeCompare(right.id))
	const reorders = operations
		.filter((operation): operation is BuilderReorderOperation => operation.kind === "reorder")
		.sort((left, right) => left.id.localeCompare(right.id))
	const steps: SaveExecutionStep[] = deletes.map((operation) => ({
		id: `step:${operation.id}`,
		kind: "delete",
		operationIds: [operation.id],
		dependsOn: [],
	}))
	const deleteStepIds = steps.map((step) => step.id)
	if (batchIds.length > 0) {
		steps.push({
			id: "step:batch",
			kind: "batch",
			operationIds: batchIds,
			dependsOn: deleteStepIds,
		})
	}
	for (const operation of creates) {
		steps.push({
			id: `step:${operation.id}`,
			kind: "create",
			operationIds: [operation.id],
			dependsOn: [
				...deleteStepIds,
				...(batchIds.length > 0 ? ["step:batch"] : []),
				...operation.dependsOn.map((id) => `step:${id}`),
			],
		})
	}
	const mutationStepIds = steps.map((step) => step.id)
	for (const operation of reorders) {
		steps.push({
			id: `step:${operation.id}`,
			kind: "reorder",
			operationIds: [operation.id],
			dependsOn: mutationStepIds,
		})
	}
	return topologicalSort(steps)
}

function topologicalSort(steps: SaveExecutionStep[]) {
	const pending = new Map(steps.map((step) => [step.id, step]))
	const completed = new Set<string>()
	const ordered: SaveExecutionStep[] = []
	while (pending.size > 0) {
		const ready = [...pending.values()]
			.filter((step) => step.dependsOn.every((dependency) => completed.has(dependency) || !pending.has(dependency)))
			.sort((left, right) => left.id.localeCompare(right.id))
		if (ready.length === 0) throw new Error("The save operation graph contains a dependency cycle.")
		for (const step of ready) {
			ordered.push(step)
			completed.add(step.id)
			pending.delete(step.id)
		}
	}
	return ordered
}

function addPatchTarget(
	targets: Map<string, PatchOperation[]>,
	id: string,
	patch: PatchOperation[]
) {
	const current = targets.get(id) ?? []
	targets.set(id, [...current, ...patch])
}

export function buildBatchRequest(
	operations: BuilderDiffOperation[],
	confirmed: BuilderDocument,
	working: BuilderDocument
): BulkUpdateExamVersionContentRequest | null {
	let versionPatch: PatchOperation[] | undefined
	const sectionPatches = new Map<string, PatchOperation[]>()
	const questionPatches = new Map<string, PatchOperation[]>()
	const optionPatches = new Map<string, PatchOperation[]>()
	const answerKeyPatches = new Map<string, PatchOperation[]>()
	for (const operation of operations) {
		if (operation.kind === "update") {
			if (operation.entity === "version") versionPatch = operation.patch
			else {
				if (operation.entityId === "version") throw new Error("Invalid update target.")
				const id = asPersisted(operation.entityId)
				if (operation.entity === "section") addPatchTarget(sectionPatches, id, operation.patch)
				else if (operation.entity === "question") addPatchTarget(questionPatches, id, operation.patch)
				else if (operation.entity === "option") addPatchTarget(optionPatches, id, operation.patch)
				else addPatchTarget(answerKeyPatches, id, operation.patch)
			}
		}
		if (operation.kind === "relationship") {
			const before = confirmed.questionsById[operation.entityId]
			const after = working.questionsById[operation.entityId]
			if (!before || !after || !("optionIds" in before) || !("optionIds" in after)) continue
			for (const optionId of after.optionIds.filter(isPersistedEntityId)) {
				const wasCorrect = before.correctOptionIds.includes(optionId)
				const isCorrect = after.correctOptionIds.includes(optionId)
				if (wasCorrect !== isCorrect) {
					addPatchTarget(optionPatches, asPersisted(optionId), [
						{ op: "replace", path: "/isCorrect", value: isCorrect },
					])
				}
			}
		}
	}
	const entries = (map: Map<string, PatchOperation[]>) =>
		[...map.entries()].sort(([left], [right]) => left.localeCompare(right))
	const request: BulkUpdateExamVersionContentRequest = {
		versionPatch,
		sectionPatches: entries(sectionPatches).map(([sectionId, operations]) => ({ sectionId, operations })),
		questionPatches: entries(questionPatches).map(([questionId, operations]) => ({ questionId, operations })),
		optionPatches: entries(optionPatches).map(([optionId, operations]) => ({ optionId, operations })),
		answerKeyPatches: entries(answerKeyPatches).map(([answerKeyId, operations]) => ({ answerKeyId, operations })),
	}
	return versionPatch || sectionPatches.size || questionPatches.size || optionPatches.size || answerKeyPatches.size
		? request
		: null
}

function isStaleRevision(error: unknown) {
	return (
		error instanceof ApiError &&
		(error.status === 412 ||
			(error.status === 409 && /concurrent|revision is stale/i.test(error.message)))
	)
}

function isUnknownMutationOutcome(error: unknown) {
	return (
		error instanceof ApiError &&
		(error.code === "network" || error.code === "timeout" || error.code === "server")
	)
}

function assertRevision(previous: number, current: number) {
	if (current !== previous + 1) {
		throw new UnexpectedRevisionAdvanceError(
			`Expected content revision ${previous + 1}, received ${current}.`
		)
	}
}

function runtimeScope(context: BuilderSaveContext): VersionContentScope {
	return { ...context.identity }
}

export function useExamBuilderSaveAll(now: () => number = Date.now) {
	const actions = useBuilderActions()
	const queryClient = useQueryClient()
	const runningRef = useRef<Promise<SaveAllResult> | null>(null)

	return useCallback(
		(trigger: SaveAllTrigger = "manual") => {
			if (runningRef.current) return runningRef.current
			const run = async (): Promise<SaveAllResult> => {
				const context = actions.getSaveContext()
				if (!context || context.working.version.status !== "draft") return { status: "blocked" }
				// Draft validation remains visible in the editor, but only publication is
				// frontend-blocked by document completeness rules. The backend remains
				// authoritative for fields it cannot persist at all.
				actions.validate("save")
				const diff = diffBuilderDocuments(context.confirmed, context.working)
				const saveId = crypto.randomUUID()
				if (!actions.beginSave(saveId, context.editGeneration)) return { status: "blocked" }
				if (diff.issues.length > 0) {
					actions.markSaveFailed(saveId, diff.issues.map((issue) => issue.message).join(" "))
					return { status: "failed", error: diff.issues }
				}
				if (diff.operations.length === 0) {
					actions.completeNoopSave(now(), trigger)
					return { status: "noop" }
				}

				const scope = runtimeScope(context)
				const plan = buildSaveExecutionPlan(diff.operations)
				const operationById = new Map(diff.operations.map((operation) => [operation.id, operation]))
				const completedOperationIds: string[] = []
				const replacements = new Map<BuilderEntityId, PersistedEntityId>()
				let runtimeDocument = cloneBuilderDocument(context.working)
				let revision = context.working.contentRevision
				let etag = context.etag

				const recordMappings = (mappings: ReadonlyMap<BuilderEntityId, PersistedEntityId>) => {
					for (const [temporaryId, persistedId] of mappings) {
						replacements.set(temporaryId, persistedId)
						actions.recordTemporaryId(saveId, temporaryId, persistedId)
					}
					runtimeDocument = replaceTemporaryIds(runtimeDocument, mappings)
				}
				const refreshRevision = async () => {
					const refreshed = await getAdminExamVersion(scope)
					assertRevision(revision, refreshed.data.contentRevision)
					revision = refreshed.data.contentRevision
					etag = refreshed.etag
					runtimeDocument.contentRevision = revision
					runtimeDocument.etag = etag
				}

				try {
					for (const step of plan) {
						if (step.kind === "delete") {
							const operation = operationById.get(step.operationIds[0] ?? "")
							if (!operation || operation.kind !== "delete") throw new Error("Missing delete operation.")
							await executeDelete(scope, context.confirmed, operation)
							completedOperationIds.push(operation.id)
							await refreshRevision()
						} else if (step.kind === "batch") {
							const request = buildBatchRequest(diff.operations, context.confirmed, context.working)
							if (request) {
								const response = await batchUpdateAdminExamVersionContent(scope, etag, request)
								assertRevision(revision, response.data.contentRevision)
								revision = response.data.contentRevision
								etag = response.etag
								runtimeDocument.contentRevision = revision
								runtimeDocument.etag = etag
							}
							completedOperationIds.push(...step.operationIds)
						} else if (step.kind === "create") {
							const operation = operationById.get(step.operationIds[0] ?? "")
							if (!operation || operation.kind !== "create") throw new Error("Missing create operation.")
							const mappings = await executeCreate(scope, runtimeDocument, operation)
							recordMappings(mappings)
							completedOperationIds.push(operation.id)
							await refreshRevision()
						} else {
							const operation = operationById.get(step.operationIds[0] ?? "")
							if (!operation || operation.kind !== "reorder") throw new Error("Missing reorder operation.")
							await executeReorder(scope, runtimeDocument, operation)
							completedOperationIds.push(operation.id)
							await refreshRevision()
						}
						actions.markSaveProgress(saveId, completedOperationIds)
					}
					const canonicalResponse = await getCompleteAdminExamVersion(scope)
					const canonical = mapFullVersionToBuilderDocument(canonicalResponse.data, {
						etag: canonicalResponse.etag,
						examArchived: context.working.examArchived,
					})
					queryClient.setQueryData(
						examBuilderQueryKeys.version(scope.examId, scope.versionId),
						canonicalResponse
					)
					await invalidateVersionControlQueries(queryClient, scope.examId)
					const completed = actions.completeSave(
						saveId,
						canonical,
						context.working,
						context.editGeneration,
						now(),
						trigger
					)
					const latest = actions.getSaveContext()
					const dirtyAfterSave = latest
						? diffBuilderDocuments(latest.confirmed, latest.working).operations.length > 0
						: false
					return completed
						? { status: "success", dirtyAfterSave }
						: { status: "reconciliation-required" }
				} catch (error) {
					const partial = completedOperationIds.length > 0
					if (partial || error instanceof UnexpectedRevisionAdvanceError || error instanceof CreatedIdentityMappingError || isUnknownMutationOutcome(error)) {
						actions.markReconciliationRequired(
							saveId,
							{
								kind: partial ? "partial-save" : "unknown-outcome",
								completedOperationIds,
								localDocumentPreserved: true,
							},
							"The server may contain only part of this save. Reload and reconcile before saving again."
						)
						return { status: "reconciliation-required" }
					}
					if (isStaleRevision(error)) {
						actions.markConflict(saveId, {
							kind: "stale-revision",
							expectedEtag: etag,
							serverEtag: null,
							localDocumentPreserved: true,
						})
						return { status: "conflict" }
					}
					actions.markSaveFailed(
						saveId,
						error instanceof Error ? error.message : "The save failed."
					)
					return { status: "failed", error }
				}
			}
			runningRef.current = run().finally(() => {
				runningRef.current = null
			})
			return runningRef.current
		},
		[actions, now, queryClient]
	)
}

async function executeDelete(
	scope: VersionContentScope,
	confirmed: BuilderDocument,
	operation: BuilderDeleteOperation
) {
	if (operation.entity === "section") {
		await deleteAdminExamSection({ ...scope, sectionId: asPersisted(operation.entityId) })
		return
	}
	if (operation.entity === "question") {
		const question = confirmed.questionsById[operation.entityId]
		if (!question) throw new Error("The deleted Question is absent from the snapshot.")
		await deleteAdminQuestion({
			...scope,
			sectionId: asPersisted(question.sectionId),
			questionId: asPersisted(question.id),
		})
		return
	}
	if (operation.entity === "option") {
		const option = confirmed.optionsById[operation.entityId]
		const question = option && confirmed.questionsById[option.questionId]
		if (!option || !question) throw new Error("The deleted Option is absent from the snapshot.")
		await deleteAdminQuestionOption({
			...scope,
			sectionId: asPersisted(question.sectionId),
			questionId: asPersisted(question.id),
			optionId: asPersisted(option.id),
		})
		return
	}
	const answer = confirmed.answerKeysById[operation.entityId]
	const question = answer && confirmed.questionsById[answer.questionId]
	if (!answer || !question) throw new Error("The deleted Answer is absent from the snapshot.")
	await deleteAdminFillAnswerKey({
		...scope,
		sectionId: asPersisted(question.sectionId),
		questionId: asPersisted(question.id),
		answerKeyId: asPersisted(answer.id),
	})
}

async function executeCreate(
	scope: VersionContentScope,
	document: BuilderDocument,
	operation: BuilderCreateOperation
) {
	if (operation.entity === "section") {
		const request = builderSectionToCreateRequest(document, operation.entityId)
		if (!request) throw new CreatedIdentityMappingError("The created Section cannot be mapped.")
		const response = await createAdminExamSection(scope, request)
		const result = mapCreatedSectionIds(document, operation.entityId, response)
		if (result.issues.length > 0) throw new CreatedIdentityMappingError(result.issues.join(" "))
		return result.mappings
	}
	if (operation.entity === "question") {
		const question = document.questionsById[operation.entityId]
		const request = builderQuestionToCreateRequest(document, operation.entityId)
		if (!question || !request) throw new CreatedIdentityMappingError("The created Question cannot be mapped.")
		const response = await createAdminQuestion(
			{ ...scope, sectionId: asPersisted(question.sectionId) },
			request
		)
		const result = mapCreatedQuestionIds(document, operation.entityId, response)
		if (result.issues.length > 0) throw new CreatedIdentityMappingError(result.issues.join(" "))
		return result.mappings
	}
	if (operation.entity === "option") {
		const option = document.optionsById[operation.entityId]
		const question = option && document.questionsById[option.questionId]
		const request = builderOptionToCreateRequest(document, operation.entityId)
		if (!option || !question || !request) throw new CreatedIdentityMappingError("The created Option cannot be mapped.")
		const response = await createAdminQuestionOption(
			{ ...scope, sectionId: asPersisted(question.sectionId), questionId: asPersisted(question.id) },
			request
		)
		return new Map([[operation.entityId, toPersistedEntityId(response.id)]])
	}
	const answer = document.answerKeysById[operation.entityId]
	const question = answer && document.questionsById[answer.questionId]
	const request = builderAnswerKeyToCreateRequest(document, operation.entityId)
	if (!answer || !question || !request) throw new CreatedIdentityMappingError("The created Answer cannot be mapped.")
	const response = await createAdminFillAnswerKey(
		{ ...scope, sectionId: asPersisted(question.sectionId), questionId: asPersisted(question.id) },
		request
	)
	return new Map([[operation.entityId, toPersistedEntityId(response.id)]])
}

async function executeReorder(
	scope: VersionContentScope,
	document: BuilderDocument,
	operation: BuilderReorderOperation
) {
	if (operation.entity === "section") {
		const request = builderSectionOrderRequest(document)
		if (!request) throw new CreatedIdentityMappingError("Section IDs are unresolved.")
		await reorderAdminExamSections(scope, request)
		return
	}
	if (operation.entity === "option") {
		if (operation.entityId === "version") throw new Error("Invalid Option reorder owner.")
		const question = document.questionsById[operation.entityId]
		const request = builderOptionOrderRequest(document, operation.entityId)
		if (!question || !request) throw new CreatedIdentityMappingError("Option IDs are unresolved.")
		await reorderAdminQuestionOptions(
			{ ...scope, sectionId: asPersisted(question.sectionId), questionId: asPersisted(question.id) },
			request
		)
		return
	}
	if (operation.entityId === "version") throw new Error("Invalid Question reorder owner.")
	const parent = operation.parentId ? document.questionsById[operation.parentId] : null
	const sectionId = parent?.sectionId ?? operation.entityId
	const request = builderQuestionOrderRequest(document, sectionId, operation.parentId)
	if (!request) throw new CreatedIdentityMappingError("Question IDs are unresolved.")
	await reorderAdminQuestions({ ...scope, sectionId: asPersisted(sectionId) }, request)
}
