import {
	builderAnswerKeyToCreateRequest,
	builderDocumentToMutationValues,
	builderOptionToCreateRequest,
	builderQuestionToCreateRequest,
	builderSectionToCreateRequest,
} from "./builder-mapper"
import { getServerId, isPersistedEntityId, isTemporaryEntityId } from "./builder-id"
import type {
	BuilderDeleteOperation,
	BuilderDiffEntityKind,
	BuilderDiffIssue,
	BuilderDiffOperation,
	BuilderDiffPlan,
	BuilderDocument,
	BuilderEntityId,
	BuilderQuestion,
	BuilderReorderOperation,
	BuilderUpdateOperation,
	PersistedEntityId,
} from "./builder.types"
import type { PatchOperation } from "../../types/exam-version.types"

const operationKindOrder: Record<BuilderDiffOperation["kind"], number> = {
	delete: 0,
	update: 1,
	relationship: 2,
	create: 3,
	reorder: 4,
}

export function diffBuilderDocuments(
	confirmed: BuilderDocument,
	working: BuilderDocument
): BuilderDiffPlan {
	const operations: BuilderDiffOperation[] = []
	const issues: BuilderDiffIssue[] = []
	const confirmedValues = builderDocumentToMutationValues(confirmed)
	const workingValues = builderDocumentToMutationValues(working)

	if (hasTemporaryIds(confirmed)) {
		issues.push({
			code: "temporary_id_in_confirmed_snapshot",
			message: "The confirmed server snapshot contains temporary IDs.",
		})
	}

	const deletedSectionIds = persistedRemovedIds(
		confirmed.sectionIds,
		working.sectionsById,
		issues,
		"section"
	)
	for (const sectionId of deletedSectionIds) {
		operations.push(
			deleteOperation("section", sectionId, collectSectionCascade(confirmed, sectionId))
		)
	}

	const sectionCascade = new Set(
		deletedSectionIds.flatMap((id) => collectSectionCascade(confirmed, id))
	)
	const deletedQuestionIds = Object.keys(confirmed.questionsById)
		.filter(isPersistedEntityId)
		.filter((id) => !working.questionsById[id] && !sectionCascade.has(id))
		.sort()
	for (const questionId of deletedQuestionIds) {
		const question = confirmed.questionsById[questionId]
		if (
			!question ||
			(question.parentGroupId !== null &&
				isPersistedEntityId(question.parentGroupId) &&
				deletedQuestionIds.includes(question.parentGroupId))
		) {
			continue
		}
		operations.push(
			deleteOperation(
				"question",
				questionId,
				collectQuestionCascade(confirmed, question)
			)
		)
	}

	const questionCascade = new Set(
		deletedQuestionIds.flatMap((id) => {
			const question = confirmed.questionsById[id]
			return question ? collectQuestionCascade(confirmed, question) : []
		})
	)
	addLeafDeletes(
		operations,
		confirmed.optionsById,
		working.optionsById,
		"option",
		new Set([...sectionCascade, ...questionCascade])
	)
	addLeafDeletes(
		operations,
		confirmed.answerKeysById,
		working.answerKeysById,
		"answer-key",
		new Set([...sectionCascade, ...questionCascade])
	)

	const versionPatch = diffFields(confirmedValues.version, workingValues.version, [
		"title",
		"description",
		"instructions",
		"durationMinutes",
	])
	if (versionPatch.length > 0) {
		operations.push({
			id: "update:version",
			kind: "update",
			entity: "version",
			entityId: "version",
			dependsOn: [],
			patch: versionPatch,
		})
	}

	addPersistedUpdates(
		operations,
		confirmed.sectionsById,
		working.sectionsById,
		confirmedValues.sections,
		workingValues.sections,
		"section",
		["kind", "title", "instructions", "stimulusText", "mediaUrl"]
	)
	addQuestionUpdates(
		operations,
		confirmed,
		working,
		confirmedValues.questions,
		workingValues.questions
	)
	addPersistedUpdates(
		operations,
		confirmed.optionsById,
		working.optionsById,
		stripCorrectness(confirmedValues.options),
		stripCorrectness(workingValues.options),
		"option",
		["text", "label", "explanation"]
	)
	addPersistedUpdates(
		operations,
		confirmed.answerKeysById,
		working.answerKeysById,
		confirmedValues.answerKeys,
		workingValues.answerKeys,
		"answer-key",
		["acceptedAnswer", "isCaseSensitive"]
	)
	addCorrectRelationships(operations, confirmed, working)

	addCreates(operations, issues, confirmed, working)
	addReorders(operations, issues, confirmed, working)
	validatePersistedIdentityOrigins(confirmed, working, issues)

	operations.sort(
		(left, right) =>
			operationKindOrder[left.kind] - operationKindOrder[right.kind] ||
			left.id.localeCompare(right.id)
	)
	return { operations, issues }
}

function addCreates(
	operations: BuilderDiffOperation[],
	issues: BuilderDiffIssue[],
	confirmed: BuilderDocument,
	working: BuilderDocument
) {
	const createdSectionIds = working.sectionIds.filter(isTemporaryEntityId)
	for (const sectionId of createdSectionIds) {
		const values = builderSectionToCreateRequest(working, sectionId)
		if (!values) {
			issues.push(missingEntityIssue("section", sectionId))
			continue
		}
		operations.push({
			id: `create:section:${sectionId}`,
			kind: "create",
			entity: "section",
			entityId: sectionId,
			parentId: null,
			dependsOn: [],
			values,
		})
	}

	for (const sectionId of working.sectionIds.filter(isPersistedEntityId)) {
		const section = working.sectionsById[sectionId]
		if (!section || !confirmed.sectionsById[sectionId]) continue
		for (const questionId of section.questionIds.filter(isTemporaryEntityId)) {
			addQuestionCreate(operations, issues, working, questionId, sectionId)
		}
	}

	for (const group of Object.values(working.questionsById)) {
		if (group.type !== "group" || !isPersistedEntityId(group.id)) continue
		for (const childId of group.childQuestionIds.filter(isTemporaryEntityId)) {
			addQuestionCreate(operations, issues, working, childId, group.id)
		}
	}

	for (const question of Object.values(working.questionsById)) {
		if (!isPersistedEntityId(question.id) || !confirmed.questionsById[question.id]) {
			continue
		}
		if (question.type === "single-choice" || question.type === "multiple-choice") {
			for (const optionId of question.optionIds.filter(isTemporaryEntityId)) {
				const values = builderOptionToCreateRequest(working, optionId)
				if (!values) {
					issues.push(missingEntityIssue("option", optionId))
					continue
				}
				operations.push({
					id: `create:option:${optionId}`,
					kind: "create",
					entity: "option",
					entityId: optionId,
					parentId: question.id,
					dependsOn: dependencyForQuestionUpdate(operations, question.id),
					values,
				})
			}
		}
		if (question.type === "fill-blank") {
			for (const answerId of question.answerKeyIds.filter(isTemporaryEntityId)) {
				const values = builderAnswerKeyToCreateRequest(working, answerId)
				if (!values) {
					issues.push(missingEntityIssue("answer-key", answerId))
					continue
				}
				operations.push({
					id: `create:answer-key:${answerId}`,
					kind: "create",
					entity: "answer-key",
					entityId: answerId,
					parentId: question.id,
					dependsOn: dependencyForQuestionUpdate(operations, question.id),
					values,
				})
			}
		}
	}
}

function addQuestionCreate(
	operations: BuilderDiffOperation[],
	issues: BuilderDiffIssue[],
	working: BuilderDocument,
	questionId: BuilderEntityId,
	parentId: BuilderEntityId
) {
	const values = builderQuestionToCreateRequest(working, questionId)
	if (!values) {
		issues.push(missingEntityIssue("question", questionId))
		return
	}
	operations.push({
		id: `create:question:${questionId}`,
		kind: "create",
		entity: "question",
		entityId: questionId,
		parentId,
		dependsOn: isTemporaryEntityId(parentId) ? [`create:section:${parentId}`] : [],
		values,
	})
}

function addQuestionUpdates(
	operations: BuilderDiffOperation[],
	confirmed: BuilderDocument,
	working: BuilderDocument,
	confirmedValues: Record<string, Record<string, unknown>>,
	workingValues: Record<string, Record<string, unknown>>
) {
	for (const id of Object.keys(confirmed.questionsById).sort()) {
		if (!isPersistedEntityId(id) || !working.questionsById[id]) continue
		const patch = diffFields(confirmedValues[id], workingValues[id], [
			"type",
			"prompt",
			"explanation",
			"points",
		])
		if (patch.length === 0) continue
		const dependsOn = operations
			.filter(
				(operation) =>
					operation.kind === "delete" && operation.cascades.includes(id)
			)
			.map((operation) => operation.id)
		operations.push(updateOperation("question", id, patch, dependsOn))
	}
}

function addPersistedUpdates<T>(
	operations: BuilderDiffOperation[],
	confirmedEntities: Record<string, T>,
	workingEntities: Record<string, T>,
	confirmedValues: Record<string, Record<string, unknown>>,
	workingValues: Record<string, Record<string, unknown>>,
	entity: Exclude<BuilderDiffEntityKind, "version" | "question">,
	fields: string[]
) {
	for (const id of Object.keys(confirmedEntities).sort()) {
		if (!isPersistedEntityId(id) || !workingEntities[id]) continue
		const patch = diffFields(confirmedValues[id], workingValues[id], fields)
		if (patch.length > 0) operations.push(updateOperation(entity, id, patch))
	}
}

function addCorrectRelationships(
	operations: BuilderDiffOperation[],
	confirmed: BuilderDocument,
	working: BuilderDocument
) {
	for (const id of Object.keys(confirmed.questionsById).sort()) {
		const before = confirmed.questionsById[id]
		const after = working.questionsById[id]
		if (
			!isPersistedEntityId(id) ||
			!before ||
			!after ||
			!("correctOptionIds" in before) ||
			!("correctOptionIds" in after) ||
			equalIds(before.correctOptionIds, after.correctOptionIds)
		) {
			continue
		}
		operations.push({
			id: `relationship:question:${id}:correct-options`,
			kind: "relationship",
			entity: "question",
			entityId: id,
			relation: "correct-options",
			optionIds: [...after.correctOptionIds],
			dependsOn: after.correctOptionIds
				.filter(isTemporaryEntityId)
				.map((optionId) => `create:option:${optionId}`),
		})
	}
}

function addReorders(
	operations: BuilderDiffOperation[],
	issues: BuilderDiffIssue[],
	confirmed: BuilderDocument,
	working: BuilderDocument
) {
	if (!equalIds(confirmed.sectionIds, working.sectionIds)) {
		operations.push(
			reorderOperation("section", "version", null, working.sectionIds, operations)
		)
	}

	for (const sectionId of working.sectionIds) {
		const before = confirmed.sectionsById[sectionId]
		const after = working.sectionsById[sectionId]
		if (before && after && !equalIds(before.questionIds, after.questionIds)) {
			operations.push(
				reorderOperation("question", sectionId, null, after.questionIds, operations)
			)
		}
	}

	for (const questionId of Object.keys(working.questionsById)
		.filter(isBuilderEntityId)
		.sort()) {
		const before = confirmed.questionsById[questionId]
		const after = working.questionsById[questionId]
		if (!before || !after) continue
		if (
			before.type === "group" &&
			after.type === "group" &&
			!equalIds(before.childQuestionIds, after.childQuestionIds)
		) {
			operations.push(
				reorderOperation(
					"question",
					questionId,
					questionId,
					after.childQuestionIds,
					operations
				)
			)
		}
		if (
			"optionIds" in before &&
			"optionIds" in after &&
			!equalIds(before.optionIds, after.optionIds)
		) {
			operations.push(
				reorderOperation("option", questionId, questionId, after.optionIds, operations)
			)
		}
		if (
			before.type === "fill-blank" &&
			after.type === "fill-blank" &&
			!isAnswerOrderAppendOnly(before.answerKeyIds, after.answerKeyIds)
		) {
			issues.push({
				code: "answer_key_reorder_unsupported",
				message: "The backend does not expose answer-key ordering or a reorder endpoint.",
				entity: "question",
				entityId: after.id,
			})
		}
	}
}

function isBuilderEntityId(value: string): value is BuilderEntityId {
	return isPersistedEntityId(value) || isTemporaryEntityId(value)
}

function reorderOperation(
	entity: "section" | "question" | "option",
	ownerId: BuilderEntityId | "version",
	parentId: BuilderEntityId | null,
	orderedIds: BuilderEntityId[],
	operations: BuilderDiffOperation[]
): BuilderReorderOperation {
	const dependencies = operations
		.filter(
			(operation) =>
				(operation.kind === "create" && orderedIds.includes(operation.entityId)) ||
				operation.kind === "delete"
		)
		.map((operation) => operation.id)
	return {
		id: `reorder:${entity}:${ownerId}`,
		kind: "reorder",
		entity,
		entityId: ownerId === "version" ? "version" : ownerId,
		parentId,
		orderedIds: [...orderedIds],
		dependsOn: [...new Set(dependencies)].sort(),
	}
}

function addLeafDeletes<T extends { id: BuilderEntityId }>(
	operations: BuilderDiffOperation[],
	confirmed: Record<string, T>,
	working: Record<string, T>,
	entity: "option" | "answer-key",
	cascade: ReadonlySet<BuilderEntityId>
) {
	for (const id of Object.keys(confirmed).filter(isPersistedEntityId).sort()) {
		if (!working[id] && !cascade.has(id)) {
			operations.push(deleteOperation(entity, id, []))
		}
	}
}

function persistedRemovedIds<T>(
	confirmedIds: BuilderEntityId[],
	working: Record<string, T>,
	issues: BuilderDiffIssue[],
	entity: BuilderDiffEntityKind
) {
	return confirmedIds
		.filter((id): id is PersistedEntityId => {
			if (isTemporaryEntityId(id)) {
				issues.push({
					code: "temporary_id_in_confirmed_snapshot",
					message: "A confirmed entity has a temporary ID.",
					entity,
					entityId: id,
				})
				return false
			}
			return !working[id]
		})
		.sort()
}

function collectSectionCascade(document: BuilderDocument, sectionId: BuilderEntityId) {
	const section = document.sectionsById[sectionId]
	if (!section) return []
	return section.questionIds.flatMap((questionId) => {
		const question = document.questionsById[questionId]
		return question ? [questionId, ...collectQuestionCascade(document, question)] : []
	})
}

function collectQuestionCascade(
	document: BuilderDocument,
	question: BuilderQuestion
): BuilderEntityId[] {
	if (question.type === "group") {
		return question.childQuestionIds.flatMap((childId) => {
			const child = document.questionsById[childId]
			return child ? [childId, ...collectQuestionCascade(document, child)] : []
		})
	}
	if (question.type === "fill-blank") return [...question.answerKeyIds]
	return [...question.optionIds]
}

function deleteOperation(
	entity: Exclude<BuilderDiffEntityKind, "version">,
	entityId: PersistedEntityId,
	cascades: BuilderEntityId[]
): BuilderDeleteOperation {
	return {
		id: `delete:${entity}:${entityId}`,
		kind: "delete",
		entity,
		entityId,
		dependsOn: [],
		cascades: [...new Set(cascades)].sort(),
	}
}

function updateOperation(
	entity: Exclude<BuilderDiffEntityKind, "version">,
	entityId: PersistedEntityId,
	patch: PatchOperation[],
	dependsOn: string[] = []
): BuilderUpdateOperation {
	return {
		id: `update:${entity}:${entityId}`,
		kind: "update",
		entity,
		entityId,
		dependsOn: [...new Set(dependsOn)].sort(),
		patch,
	}
}

function diffFields(
	before: Record<string, unknown> | undefined,
	after: Record<string, unknown> | undefined,
	fields: string[]
) {
	if (!before || !after) return []
	return fields.flatMap<PatchOperation>((field) => {
		if (Object.is(before[field], after[field])) return []
		return after[field] === null
			? [{ op: "remove", path: `/${field}` }]
			: [{ op: "replace", path: `/${field}`, value: after[field] }]
	})
}

function stripCorrectness(
	values: Record<
		string,
		{ text: string; label: string | null; isCorrect: boolean; explanation: string | null }
	>
) {
	return Object.fromEntries(
		Object.entries(values).map(([id, value]) => [
			id,
			{ text: value.text, label: value.label, explanation: value.explanation },
		])
	)
}

function hasTemporaryIds(document: BuilderDocument) {
	return [
		...document.sectionIds,
		...Object.keys(document.questionsById),
		...Object.keys(document.optionsById),
		...Object.keys(document.answerKeysById),
	].some(isTemporaryEntityId)
}

function validatePersistedIdentityOrigins(
	confirmed: BuilderDocument,
	working: BuilderDocument,
	issues: BuilderDiffIssue[]
) {
	const confirmedIds = new Set([
		...Object.keys(confirmed.sectionsById),
		...Object.keys(confirmed.questionsById),
		...Object.keys(confirmed.optionsById),
		...Object.keys(confirmed.answerKeysById),
	])
	for (const id of [
		...Object.keys(working.sectionsById),
		...Object.keys(working.questionsById),
		...Object.keys(working.optionsById),
		...Object.keys(working.answerKeysById),
	].filter(isPersistedEntityId)) {
		if (!confirmedIds.has(id)) {
			issues.push({
				code: "unknown_persisted_id",
				message: "The working document contains a server ID absent from the snapshot.",
				entityId: id,
			})
		}
	}
}

function dependencyForQuestionUpdate(
	operations: BuilderDiffOperation[],
	questionId: BuilderEntityId
) {
	const id = `update:question:${questionId}`
	return operations.some((operation) => operation.id === id) ? [id] : []
}

function isAnswerOrderAppendOnly(
	before: BuilderEntityId[],
	after: BuilderEntityId[]
) {
	const persistedAfter = after.filter(isPersistedEntityId)
	const firstTemporary = after.findIndex(isTemporaryEntityId)
	return (
		equalIds(before, persistedAfter) &&
		(firstTemporary === -1 || after.slice(firstTemporary).every(isTemporaryEntityId))
	)
}

function equalIds(left: BuilderEntityId[], right: BuilderEntityId[]) {
	return left.length === right.length && left.every((id, index) => id === right[index])
}

function missingEntityIssue(
	entity: Exclude<BuilderDiffEntityKind, "version">,
	entityId: BuilderEntityId
): BuilderDiffIssue {
	return {
		code: "create_entity_missing",
		message: "A temporary entity could not be mapped to a create request.",
		entity,
		entityId,
	}
}

export function getPersistedDiffTargetId(operation: BuilderDiffOperation) {
	return operation.entityId === "version" ? null : getServerId(operation.entityId)
}
