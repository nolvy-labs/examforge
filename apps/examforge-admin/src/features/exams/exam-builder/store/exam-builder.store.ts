"use client"

import { create } from "zustand"
import { useShallow } from "zustand/react/shallow"

import {
	builderDocumentsSemanticallyEqual,
	cloneBuilderDocument,
	normalizeBuilderOrder,
} from "../model/builder-derived"
import {
	createTemporaryEntityId,
	isTemporaryEntityId,
} from "../model/builder-id"
import { replaceTemporaryIds } from "../model/builder-mapper"
import { repairBuilderSelection } from "../model/builder-selection"
import { validateBuilderDocument } from "../model/builder-validation"
import { plainTextToRichText } from "../model/rich-text"
import type {
	BuilderAnswerKey,
	BuilderConflictState,
	BuilderDocument,
	BuilderEntityId,
	BuilderOption,
	BuilderQuestion,
	BuilderReconciliationState,
	BuilderSection,
	BuilderSelection,
	BuilderValidationError,
	PersistedEntityId,
	RichTextValue,
} from "../model/builder.types"

export const BUILDER_AUTOSAVE_INTERVAL_MS = 5 * 60 * 1_000

export type BuilderDataStatus =
	| "uninitialized"
	| "saved"
	| "unsaved"
	| "saving"
	| "failed"
	| "conflict"
	| "reconciliation-required"
	| "read-only"

export type BuilderPublishStatus = "idle" | "publishing" | "failed"
export type BuilderSuccessfulSaveTrigger =
	| "initialization"
	| "manual"
	| "auto"
	| "publish"

export interface BuilderSaveContext {
	identity: { examId: string; versionId: string }
	confirmed: BuilderDocument
	working: BuilderDocument
	editGeneration: number
	etag: string
}

interface QuestionChanges {
	prompt?: RichTextValue
	explanation?: RichTextValue | null
	points?: number
}

interface BuilderActions {
	initialize: (document: BuilderDocument, now: number) => boolean
	forceReload: (document: BuilderDocument, now: number) => void
	reset: () => void
	setSelection: (selection: BuilderSelection) => void
	setExpanded: (id: BuilderEntityId, expanded: boolean) => void
	updateVersion: (
		changes: Partial<
			Pick<
				BuilderDocument["version"],
				"title" | "description" | "instructions" | "durationMinutes"
			>
		>
	) => boolean
	createSection: (changes?: Partial<Pick<BuilderSection, "kind" | "title">>) => BuilderEntityId | null
	updateSection: (
		id: BuilderEntityId,
		changes: Partial<
			Pick<
				BuilderSection,
				"kind" | "title" | "instructions" | "stimulusText" | "mediaUrl"
			>
		>
	) => boolean
	deleteSection: (id: BuilderEntityId) => boolean
	moveSection: (id: BuilderEntityId, direction: -1 | 1) => boolean
	createQuestion: (
		sectionId: BuilderEntityId,
		type: BuilderQuestion["type"],
		parentGroupId?: BuilderEntityId | null
	) => BuilderEntityId | null
	updateQuestion: (id: BuilderEntityId, changes: QuestionChanges) => boolean
	changeQuestionType: (id: BuilderEntityId, type: BuilderQuestion["type"]) => boolean
	deleteQuestion: (id: BuilderEntityId) => boolean
	moveQuestion: (id: BuilderEntityId, direction: -1 | 1) => boolean
	createOption: (questionId: BuilderEntityId) => BuilderEntityId | null
	updateOption: (
		id: BuilderEntityId,
		changes: Partial<Pick<BuilderOption, "label" | "content" | "explanation">>
	) => boolean
	deleteOption: (id: BuilderEntityId) => boolean
	moveOption: (id: BuilderEntityId, direction: -1 | 1) => boolean
	setCorrectOptions: (questionId: BuilderEntityId, ids: BuilderEntityId[]) => boolean
	createAnswerKey: (questionId: BuilderEntityId) => BuilderEntityId | null
	updateAnswerKey: (
		id: BuilderEntityId,
		changes: Partial<Pick<BuilderAnswerKey, "acceptedAnswer" | "isCaseSensitive">>
	) => boolean
	deleteAnswerKey: (id: BuilderEntityId) => boolean
	validate: (mode: "save" | "publish") => BuilderValidationError[]
	getSaveContext: () => BuilderSaveContext | null
	beginSave: (saveId: string, generation: number) => boolean
	markSaveProgress: (saveId: string, completedOperationIds: string[]) => void
	recordTemporaryId: (
		saveId: string,
		temporaryId: BuilderEntityId,
		persistedId: PersistedEntityId
	) => void
	completeSave: (
		saveId: string,
		canonical: BuilderDocument,
		captured: BuilderDocument,
		capturedGeneration: number,
		now: number,
		trigger: Exclude<BuilderSuccessfulSaveTrigger, "initialization">
	) => boolean
	completeNoopSave: (
		now: number,
		trigger: Exclude<BuilderSuccessfulSaveTrigger, "initialization">
	) => void
	markSaveFailed: (saveId: string, message: string) => void
	markConflict: (saveId: string, conflict: BuilderConflictState) => void
	markReconciliationRequired: (
		saveId: string,
		reconciliation: BuilderReconciliationState,
		message: string
	) => void
	markAutosaveAttempt: (deadline: number) => void
	beginPublish: () => boolean
	finishPublish: (success: boolean) => void
}

interface BuilderState {
	identity: { examId: string; versionId: string } | null
	confirmedDocument: BuilderDocument | null
	workingDocument: BuilderDocument | null
	selection: BuilderSelection
	expandedIds: Record<string, true>
	saveValidationErrors: BuilderValidationError[]
	publishValidationErrors: BuilderValidationError[]
	dirty: boolean
	editGeneration: number
	status: BuilderDataStatus
	statusMessage: string
	lastSuccessfulSaveAt: number | null
	lastSuccessfulSaveTrigger: BuilderSuccessfulSaveTrigger | null
	autosaveDeadline: number | null
	lastAutosaveAttemptedDeadline: number | null
	conflict: BuilderConflictState | null
	reconciliation: BuilderReconciliationState | null
	inFlightSave: {
		id: string
		generation: number
		completedOperationIds: string[]
	} | null
	temporaryIdMappings: Record<string, PersistedEntityId>
	publishStatus: BuilderPublishStatus
	actions: BuilderActions
}

const initialState = () => ({
	identity: null,
	confirmedDocument: null,
	workingDocument: null,
	selection: { type: "version" } as BuilderSelection,
	expandedIds: {},
	saveValidationErrors: [],
	publishValidationErrors: [],
	dirty: false,
	editGeneration: 0,
	status: "uninitialized" as BuilderDataStatus,
	statusMessage: "",
	lastSuccessfulSaveAt: null,
	lastSuccessfulSaveTrigger: null,
	autosaveDeadline: null,
	lastAutosaveAttemptedDeadline: null,
	conflict: null,
	reconciliation: null,
	inFlightSave: null,
	temporaryIdMappings: {},
	publishStatus: "idle" as BuilderPublishStatus,
})

function isEditable(state: BuilderState) {
	return (
		state.workingDocument?.version.status === "draft" &&
		!state.workingDocument.examArchived &&
		state.conflict === null &&
		state.reconciliation === null
	)
}

function derivedWorkingState(
	state: BuilderState,
	workingDocument: BuilderDocument,
	selection = state.selection
) {
	const confirmed = state.confirmedDocument
	const dirty = confirmed
		? !builderDocumentsSemanticallyEqual(confirmed, workingDocument)
		: false
	return {
		workingDocument,
		selection,
		dirty,
		editGeneration: state.editGeneration + 1,
		saveValidationErrors: validateBuilderDocument(workingDocument, "save"),
		publishValidationErrors: validateBuilderDocument(workingDocument, "publish"),
		status:
			state.inFlightSave !== null
				? ("saving" as const)
				: dirty
					? ("unsaved" as const)
					: ("saved" as const),
		statusMessage: "",
	}
}

function moveId(ids: BuilderEntityId[], id: BuilderEntityId, direction: -1 | 1) {
	const index = ids.indexOf(id)
	const target = index + direction
	if (index < 0 || target < 0 || target >= ids.length) return false
	;[ids[index], ids[target]] = [ids[target], ids[index]]
	return true
}

function removeQuestionTree(document: BuilderDocument, id: BuilderEntityId) {
	const question = document.questionsById[id]
	if (!question) return
	if (question.type === "group") {
		for (const childId of question.childQuestionIds) removeQuestionTree(document, childId)
	} else if (question.type === "fill-blank") {
		for (const answerId of question.answerKeyIds) delete document.answerKeysById[answerId]
	} else {
		for (const optionId of question.optionIds) delete document.optionsById[optionId]
	}
	delete document.questionsById[id]
}

function hasOwnedContent(question: BuilderQuestion) {
	return question.type === "group"
		? question.childQuestionIds.length > 0
		: question.type === "fill-blank"
			? question.answerKeyIds.length > 0
			: question.optionIds.length > 0
}

const useExamBuilderStore = create<BuilderState>((set, get) => {
	const edit = (recipe: (document: BuilderDocument) => boolean) => {
		const state = get()
		if (!isEditable(state) || !state.workingDocument) return false
		const previous = state.workingDocument
		const working = cloneBuilderDocument(previous)
		if (!recipe(working)) return false
		const normalized = normalizeBuilderOrder(working)
		set(
			derivedWorkingState(
				state,
				normalized,
				repairBuilderSelection(previous, normalized, state.selection)
			)
		)
		return true
	}

	const actions: BuilderActions = {
		initialize: (document, now) => {
			const identity = {
				examId: document.version.examId,
				versionId: document.version.id.slice("server:".length),
			}
			const current = get()
			if (
				current.identity?.examId === identity.examId &&
				current.identity.versionId === identity.versionId
			) {
				return false
			}
			const confirmed = cloneBuilderDocument(document)
			const working = cloneBuilderDocument(document)
			const readOnly = document.version.status !== "draft" || document.examArchived
			set({
				...initialState(),
				identity,
				confirmedDocument: confirmed,
				workingDocument: working,
				saveValidationErrors: validateBuilderDocument(working, "save"),
				publishValidationErrors: validateBuilderDocument(working, "publish"),
				status: readOnly ? "read-only" : "saved",
				lastSuccessfulSaveAt: now,
				lastSuccessfulSaveTrigger: "initialization",
				autosaveDeadline: readOnly ? null : now + BUILDER_AUTOSAVE_INTERVAL_MS,
			})
			return true
		},
		forceReload: (document, now) => {
			set(initialState())
			actions.initialize(document, now)
		},
		reset: () => set(initialState()),
		setSelection: (selection) => set({ selection }),
		setExpanded: (id, expanded) =>
			set((state) => {
				const expandedIds = { ...state.expandedIds }
				if (expanded) expandedIds[id] = true
				else delete expandedIds[id]
				return { expandedIds }
			}),
		updateVersion: (changes) =>
			edit((document) => {
				document.version = { ...document.version, ...changes }
				return true
			}),
		createSection: (changes) => {
			const id = createTemporaryEntityId("section")
			return edit((document) => {
				document.sectionsById[id] = {
					id,
					kind: changes?.kind ?? 0,
					title: changes?.title ?? "Untitled section",
					instructions: plainTextToRichText(""),
					stimulusText: null,
					mediaUrl: null,
					displayOrder: document.sectionIds.length,
					questionIds: [],
					createdAtUtc: null,
					updatedAtUtc: null,
				}
				document.sectionIds.push(id)
				return true
			})
				? id
				: null
		},
		updateSection: (id, changes) =>
			edit((document) => {
				const section = document.sectionsById[id]
				if (!section) return false
				document.sectionsById[id] = { ...section, ...changes }
				return true
			}),
		deleteSection: (id) =>
			edit((document) => {
				const section = document.sectionsById[id]
				if (!section) return false
				for (const questionId of section.questionIds) removeQuestionTree(document, questionId)
				delete document.sectionsById[id]
				document.sectionIds = document.sectionIds.filter((sectionId) => sectionId !== id)
				return true
			}),
		moveSection: (id, direction) =>
			edit((document) => moveId(document.sectionIds, id, direction)),
		createQuestion: (sectionId, type, parentGroupId = null) => {
			const id = createTemporaryEntityId("question")
			return edit((document) => {
				const section = document.sectionsById[sectionId]
				const parent = parentGroupId ? document.questionsById[parentGroupId] : null
				if (
					!section ||
					(parentGroupId && parent?.type !== "group") ||
					(parent?.type === "group" && parent.sectionId !== sectionId) ||
					(parentGroupId && type === "group")
				) {
					return false
				}
				const common = {
					id,
					sectionId,
					parentGroupId,
					prompt: plainTextToRichText(""),
					explanation: null,
					points: type === "group" ? 0 : 1,
					displayOrder: parent?.type === "group" ? parent.childQuestionIds.length : section.questionIds.length,
					createdAtUtc: null,
					updatedAtUtc: null,
				}
				const question: BuilderQuestion =
					type === "group"
						? { ...common, type, parentGroupId: null, points: 0, childQuestionIds: [] }
						: type === "fill-blank"
							? { ...common, type, answerKeyIds: [] }
							: { ...common, type, optionIds: [], correctOptionIds: [] }
				document.questionsById[id] = question
				if (parent?.type === "group") parent.childQuestionIds.push(id)
				else section.questionIds.push(id)
				return true
			})
				? id
				: null
		},
		updateQuestion: (id, changes) =>
			edit((document) => {
				const question = document.questionsById[id]
				if (!question) return false
				if (question.type === "group" && changes.points !== undefined && changes.points !== 0) return false
				if (question.type === "group") {
					document.questionsById[id] = { ...question, ...changes, points: 0 }
				} else {
					document.questionsById[id] = { ...question, ...changes }
				}
				return true
			}),
		changeQuestionType: (id, type) =>
			edit((document) => {
				const question = document.questionsById[id]
				if (!question || question.type === type || hasOwnedContent(question)) return false
				if (type === "group" && question.parentGroupId !== null) return false
				const common = {
					id: question.id,
					sectionId: question.sectionId,
					parentGroupId: question.parentGroupId,
					prompt: question.prompt,
					explanation: question.explanation,
					points: type === "group" ? 0 : question.points || 1,
					displayOrder: question.displayOrder,
					createdAtUtc: question.createdAtUtc,
					updatedAtUtc: question.updatedAtUtc,
				}
				document.questionsById[id] =
					type === "group"
						? { ...common, type, parentGroupId: null, points: 0, childQuestionIds: [] }
						: type === "fill-blank"
							? { ...common, type, answerKeyIds: [] }
							: { ...common, type, optionIds: [], correctOptionIds: [] }
				return true
			}),
		deleteQuestion: (id) =>
			edit((document) => {
				const question = document.questionsById[id]
				if (!question) return false
				const owner = question.parentGroupId
					? document.questionsById[question.parentGroupId]
					: document.sectionsById[question.sectionId]
				if (owner && "childQuestionIds" in owner) {
					owner.childQuestionIds = owner.childQuestionIds.filter((questionId) => questionId !== id)
				} else if (owner && "questionIds" in owner) {
					owner.questionIds = owner.questionIds.filter((questionId) => questionId !== id)
				}
				removeQuestionTree(document, id)
				return true
			}),
		moveQuestion: (id, direction) =>
			edit((document) => {
				const question = document.questionsById[id]
				if (!question) return false
				if (question.parentGroupId) {
					const parent = document.questionsById[question.parentGroupId]
					return parent?.type === "group" && moveId(parent.childQuestionIds, id, direction)
				}
				const section = document.sectionsById[question.sectionId]
				return section ? moveId(section.questionIds, id, direction) : false
			}),
		createOption: (questionId) => {
			const id = createTemporaryEntityId("option")
			return edit((document) => {
				const question = document.questionsById[questionId]
				if (question?.type !== "single-choice" && question?.type !== "multiple-choice") return false
				document.optionsById[id] = {
					id,
					questionId,
					label: null,
					content: plainTextToRichText(""),
					explanation: null,
					displayOrder: question.optionIds.length,
					createdAtUtc: null,
					updatedAtUtc: null,
				}
				question.optionIds.push(id)
				return true
			})
				? id
				: null
		},
		updateOption: (id, changes) =>
			edit((document) => {
				const option = document.optionsById[id]
				if (!option) return false
				document.optionsById[id] = { ...option, ...changes }
				return true
			}),
		deleteOption: (id) =>
			edit((document) => {
				const option = document.optionsById[id]
				const question = option && document.questionsById[option.questionId]
				if (!option || (question?.type !== "single-choice" && question?.type !== "multiple-choice")) return false
				question.optionIds = question.optionIds.filter((optionId) => optionId !== id)
				question.correctOptionIds = question.correctOptionIds.filter((optionId) => optionId !== id)
				delete document.optionsById[id]
				return true
			}),
		moveOption: (id, direction) =>
			edit((document) => {
				const option = document.optionsById[id]
				const question = option && document.questionsById[option.questionId]
				return question && (question.type === "single-choice" || question.type === "multiple-choice")
					? moveId(question.optionIds, id, direction)
					: false
			}),
		setCorrectOptions: (questionId, ids) =>
			edit((document) => {
				const question = document.questionsById[questionId]
				if (question?.type !== "single-choice" && question?.type !== "multiple-choice") return false
				const valid = [...new Set(ids)].filter((id) => question.optionIds.includes(id))
				question.correctOptionIds = question.type === "single-choice" ? valid.slice(0, 1) : valid
				return true
			}),
		createAnswerKey: (questionId) => {
			const id = createTemporaryEntityId("answer-key")
			return edit((document) => {
				const question = document.questionsById[questionId]
				if (question?.type !== "fill-blank") return false
				document.answerKeysById[id] = {
					id,
					questionId,
					blankKey: "answer",
					acceptedAnswer: "",
					isCaseSensitive: false,
					displayOrder: question.answerKeyIds.length,
					serverOrderKnown: false,
					createdAtUtc: null,
					updatedAtUtc: null,
				}
				question.answerKeyIds.push(id)
				return true
			})
				? id
				: null
		},
		updateAnswerKey: (id, changes) =>
			edit((document) => {
				const answer = document.answerKeysById[id]
				if (!answer) return false
				document.answerKeysById[id] = { ...answer, ...changes }
				return true
			}),
		deleteAnswerKey: (id) =>
			edit((document) => {
				const answer = document.answerKeysById[id]
				const question = answer && document.questionsById[answer.questionId]
				if (!answer || question?.type !== "fill-blank") return false
				question.answerKeyIds = question.answerKeyIds.filter((answerId) => answerId !== id)
				delete document.answerKeysById[id]
				return true
			}),
		validate: (mode) => {
			const document = get().workingDocument
			const errors = document ? validateBuilderDocument(document, mode) : []
			set(mode === "save" ? { saveValidationErrors: errors } : { publishValidationErrors: errors })
			return errors
		},
		getSaveContext: () => {
			const state = get()
			if (!state.identity || !state.confirmedDocument || !state.workingDocument || !state.workingDocument.etag) return null
			return {
				identity: { ...state.identity },
				confirmed: cloneBuilderDocument(state.confirmedDocument),
				working: cloneBuilderDocument(state.workingDocument),
				editGeneration: state.editGeneration,
				etag: state.workingDocument.etag,
			}
		},
		beginSave: (saveId, generation) => {
			const state = get()
			if (
				!isEditable(state) ||
				state.inFlightSave ||
				state.publishStatus === "publishing" ||
				state.editGeneration !== generation
			) return false
			set({
				inFlightSave: { id: saveId, generation, completedOperationIds: [] },
				status: "saving",
				statusMessage: "",
			})
			return true
		},
		markSaveProgress: (saveId, completedOperationIds) => {
			const current = get().inFlightSave
			if (current?.id === saveId) set({ inFlightSave: { ...current, completedOperationIds: [...completedOperationIds] } })
		},
		recordTemporaryId: (saveId, temporaryId, persistedId) => {
			if (get().inFlightSave?.id !== saveId) return
			set((state) => ({
				temporaryIdMappings: { ...state.temporaryIdMappings, [temporaryId]: persistedId },
			}))
		},
		completeSave: (saveId, canonical, captured, capturedGeneration, now, trigger) => {
			const state = get()
			if (state.inFlightSave?.id !== saveId || !state.workingDocument) return false
			const replacements = new Map<BuilderEntityId, PersistedEntityId>()
			for (const [temporaryId, persistedId] of Object.entries(state.temporaryIdMappings)) {
				if (isTemporaryEntityId(temporaryId)) replacements.set(temporaryId, persistedId)
			}
			let working = cloneBuilderDocument(canonical)
			let dirty = false
			let status: BuilderDataStatus = canonical.version.status === "draft" ? "saved" : "read-only"
			if (state.editGeneration !== capturedGeneration) {
				const submitted = replaceTemporaryIds(captured, replacements)
				if (!builderDocumentsSemanticallyEqual(submitted, canonical)) {
					set({
						inFlightSave: null,
						reconciliation: {
							kind: "unknown-outcome",
							completedOperationIds: [...state.inFlightSave.completedOperationIds],
							localDocumentPreserved: true,
						},
						status: "reconciliation-required",
						statusMessage: "Server normalization prevented a safe rebase of edits made during saving.",
					})
					return false
				}
				working = replaceTemporaryIds(state.workingDocument, replacements)
				working.contentRevision = canonical.contentRevision
				working.etag = canonical.etag
				working.serverTotalScore = canonical.serverTotalScore
				dirty = !builderDocumentsSemanticallyEqual(canonical, working)
				status = dirty ? "unsaved" : "saved"
			}
			set({
				confirmedDocument: cloneBuilderDocument(canonical),
				workingDocument: working,
				dirty,
				saveValidationErrors: validateBuilderDocument(working, "save"),
				publishValidationErrors: validateBuilderDocument(working, "publish"),
				status,
				statusMessage: "",
				lastSuccessfulSaveAt: now,
				lastSuccessfulSaveTrigger: trigger,
				autosaveDeadline: status === "read-only" ? null : now + BUILDER_AUTOSAVE_INTERVAL_MS,
				lastAutosaveAttemptedDeadline: null,
				conflict: null,
				reconciliation: null,
				inFlightSave: null,
				temporaryIdMappings: {},
			})
			return true
		},
		completeNoopSave: (now, trigger) =>
			set((state) => ({
				status: state.workingDocument?.version.status === "draft" ? "saved" : "read-only",
				lastSuccessfulSaveAt: now,
				lastSuccessfulSaveTrigger: trigger,
				autosaveDeadline: state.workingDocument?.version.status === "draft" ? now + BUILDER_AUTOSAVE_INTERVAL_MS : null,
				lastAutosaveAttemptedDeadline: null,
				inFlightSave: null,
			})),
		markSaveFailed: (saveId, message) => {
			const state = get()
			if (state.inFlightSave?.id === saveId) set({
				inFlightSave: null,
				status: "failed",
				statusMessage: message,
				lastAutosaveAttemptedDeadline: state.autosaveDeadline,
			})
		},
		markConflict: (saveId, conflict) => {
			if (get().inFlightSave?.id === saveId) set({
				inFlightSave: null,
				conflict,
				status: "conflict",
				statusMessage: "The server version changed. Reload it before saving again.",
			})
		},
		markReconciliationRequired: (saveId, reconciliation, message) => {
			if (get().inFlightSave?.id === saveId) set({ inFlightSave: null, reconciliation, status: "reconciliation-required", statusMessage: message })
		},
		markAutosaveAttempt: (deadline) => set({ lastAutosaveAttemptedDeadline: deadline }),
		beginPublish: () => {
			const state = get()
			if (state.publishStatus === "publishing" || state.inFlightSave || state.conflict || state.reconciliation) return false
			set({ publishStatus: "publishing" })
			return true
		},
		finishPublish: (success) => set({ publishStatus: success ? "idle" : "failed" }),
	}
	return { ...initialState(), actions }
})

export const useBuilderIdentity = () => useExamBuilderStore((state) => state.identity)
export const useBuilderDocument = () => useExamBuilderStore((state) => state.workingDocument)
export const useBuilderSelection = () => useExamBuilderStore((state) => state.selection)
export const useBuilderExpandedIds = () => useExamBuilderStore((state) => state.expandedIds)
export const useBuilderValidation = () =>
	useExamBuilderStore(
		useShallow((state) => ({
			save: state.saveValidationErrors,
			publish: state.publishValidationErrors,
		}))
	)
export const useBuilderSaveStatus = () =>
	useExamBuilderStore(
		useShallow((state) => ({
			status: state.status,
			message: state.statusMessage,
			dirty: state.dirty,
			lastSuccessfulSaveAt: state.lastSuccessfulSaveAt,
			lastSuccessfulSaveTrigger: state.lastSuccessfulSaveTrigger,
			autosaveDeadline: state.autosaveDeadline,
			lastAutosaveAttemptedDeadline: state.lastAutosaveAttemptedDeadline,
			isSaving: state.inFlightSave !== null,
			conflict: state.conflict,
			reconciliation: state.reconciliation,
		}))
	)
export const useBuilderPublishStatus = () => useExamBuilderStore((state) => state.publishStatus)
export const useShouldBlockBuilderNavigation = () =>
	useExamBuilderStore(
		(state) => state.dirty || state.inFlightSave !== null || state.conflict !== null || state.reconciliation !== null
	)
export const useBuilderActions = () => useExamBuilderStore((state) => state.actions)
